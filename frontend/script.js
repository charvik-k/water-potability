const isLocalDevelopment = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const configuredApiBase = document.querySelector('meta[name="api-base-url"]')?.content.trim().replace(/\/$/, '');
const apiBaseUrl = isLocalDevelopment ? 'http://127.0.0.1:8000' : (configuredApiBase || '/api');
const apiUrl = `${apiBaseUrl}/predict`;
const form = document.querySelector('#water-form');
const submitButton = document.querySelector('#submit-button');
const buttonLabel = submitButton.querySelector('.button-label');
const formError = document.querySelector('#form-error');
const resultCard = document.querySelector('.result-card');
const resultTitle = document.querySelector('#result-title');
const resultDescription = document.querySelector('.result-description');
const probabilityValue = document.querySelector('.probability-value');
const probabilityTrack = document.querySelector('.probability-track');
const probabilityFill = document.querySelector('.probability-fill');
const resultState = document.querySelector('.result-state span');

// Keep the submitted names and ordering aligned with the trained pipeline.
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

let isLoading = false;

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

function setLoading(loading) {
  isLoading = loading;
  submitButton.disabled = loading;
  submitButton.classList.toggle('loading', loading);
  submitButton.setAttribute('aria-busy', String(loading));
  resultCard.classList.toggle('loading', loading);
  resultState.textContent = loading ? 'ANALYZING' : (resultCard.classList.contains('has-result') ? 'COMPLETE' : 'AWAITING SAMPLE');
  buttonLabel.textContent = loading ? 'Analyzing sample...' : 'Analyze Water';
}

function renderPrediction(data) {
  const className = data.prediction === 1 ? 'potable' : 'non-potable';
  const percentage = data.probability * 100;

  resultCard.classList.remove('potable', 'non-potable');
  resultCard.classList.add('has-result', className);
  resultTitle.textContent = data.label;
  resultDescription.textContent = 'Predicted classification for this water sample.';
  probabilityValue.textContent = `${percentage.toFixed(2)}%`;
  probabilityTrack.setAttribute('aria-valuenow', percentage.toFixed(2));

  // Let the browser paint the empty track before animating to the returned probability.
  probabilityFill.style.width = '0%';
  requestAnimationFrame(() => {
    probabilityFill.style.width = `${percentage}%`;
  });
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
  if (isLoading) return;
  clearError();
  if (!validateForm()) return;

  const payload = Object.fromEntries(
    featureNames.map((name) => [name, Number(form.elements.namedItem(name).value)]),
  );

  setLoading(true);
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.detail || 'The analysis service could not process this sample.');
    }
    if (![0, 1].includes(data.prediction) || typeof data.label !== 'string' || !Number.isFinite(data.probability) || data.probability < 0 || data.probability > 1) {
      throw new Error('The prediction service returned an unexpected result. Please try again.');
    }

    renderPrediction(data);
  } catch (error) {
    const message = error instanceof TypeError
      ? `The request to ${new URL(apiUrl, window.location.href).href} could not be completed. Check the API route and backend availability.`
      : error.message;
    showError(message);
  } finally {
    setLoading(false);
  }
});
