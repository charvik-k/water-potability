const configuredApiBase = document.querySelector('meta[name="api-base-url"]')?.content.trim().replace(/\/$/, '');
const isLocalDevelopment = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const apiBaseUrl = configuredApiBase || (isLocalDevelopment ? 'http://127.0.0.1:8000' : '');
const API_URL = apiBaseUrl ? `${apiBaseUrl}/predict` : '';

const form = document.querySelector('#water-form');
const submitButton = document.querySelector('#submit-button');
const buttonLabel = submitButton.querySelector('.button-label');
const formError = document.querySelector('#form-error');
const resultPanel = document.querySelector('.result-panel');
const resultTitle = document.querySelector('#result-title');
const resultDescription = document.querySelector('.result-description');
const probabilityValue = document.querySelector('.probability-placeholder');
const resultLive = document.querySelector('.result-live');

// Keep the submitted property names identical to those expected by the API.
const featureNames = [
  'ph',
  'Hardness',
  'Solids',
  'Chloramines',
  'Sulfate',
  'Conductivity',
  'Organic_carbon',
  'Trihalomethanes',
  'Turbidity',
];

function showError(message) {
  formError.textContent = message;
  formError.hidden = false;
}

function clearError() {
  formError.textContent = '';
  formError.hidden = true;
}

function validateForm() {
  let firstInvalid = null;

  featureNames.forEach((name) => {
    const input = form.elements.namedItem(name);
    const field = input.closest('.field');
    const value = input.value.trim();
    const number = Number(value);
    const invalid = value === '' || !Number.isFinite(number) || number < 0 || (name === 'ph' && number > 14);

    field.classList.toggle('invalid', invalid);
    input.setAttribute('aria-invalid', String(invalid));
    if (invalid && !firstInvalid) firstInvalid = input;
  });

  if (firstInvalid) {
    showError('Enter a valid value for every measurement. Values must be non-negative, and pH must be between 0 and 14.');
    firstInvalid.focus();
    return false;
  }
  return true;
}

form.addEventListener('input', (event) => {
  const input = event.target;
  if (input.matches('input[type="number"]')) {
    input.closest('.field').classList.remove('invalid');
    input.setAttribute('aria-invalid', 'false');
    clearError();
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearError();
  if (!validateForm()) return;

  const payload = Object.fromEntries(
    featureNames.map((name) => [name, Number(form.elements.namedItem(name).value)]),
  );

  submitButton.disabled = true;
  submitButton.classList.add('loading');
  submitButton.setAttribute('aria-busy', 'true');
  buttonLabel.textContent = 'Analyzing sample...';
  resultLive.innerHTML = '<span class="status-dot"></span> ANALYZING';

  try {
    if (!API_URL) {
      throw new Error('Set the deployed backend URL in the api-base-url meta tag before publishing this frontend.');
    }
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.detail || 'The analysis service could not process this sample.');
    }
    if (![0, 1].includes(data.prediction) || typeof data.label !== 'string' || !Number.isFinite(data.probability)) {
      throw new Error('The prediction service returned an unexpected result. Please try again.');
    }

    resultTitle.textContent = data.label;
    resultDescription.textContent = 'Predicted classification for this water sample.';
    probabilityValue.textContent = `${(data.probability * 100).toFixed(1)}%`;
    resultPanel.classList.remove('potable', 'non-potable');
    resultPanel.classList.add('has-result', data.prediction === 1 ? 'potable' : 'non-potable');
    resultLive.innerHTML = '<span class="status-dot"></span> COMPLETE';
  } catch (error) {
    resultLive.innerHTML = '<span class="status-dot"></span> READY';
    const message = error instanceof TypeError
      ? 'Could not reach the prediction API. Make sure the backend is running at http://127.0.0.1:8000.'
      : error.message;
    showError(message);
  } finally {
    submitButton.disabled = false;
    submitButton.classList.remove('loading');
    submitButton.removeAttribute('aria-busy');
    buttonLabel.textContent = 'Analyze Water';
  }
});
