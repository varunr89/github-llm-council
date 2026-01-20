const promptInput = document.getElementById('prompt-input');
const submitBtn = document.getElementById('submit-btn');
const chips = document.querySelectorAll('.chip');
const columns = document.querySelectorAll('.council-column');
const modelSelects = document.querySelectorAll('.model-select');

let availableModels = [];

// Fetch and populate available models
async function loadModels() {
  try {
    const response = await fetch('/api/models');
    const data = await response.json();
    availableModels = data.models || [];

    modelSelects.forEach((select, index) => {
      select.textContent = '';
      availableModels.forEach((model, modelIndex) => {
        const option = document.createElement('option');
        option.value = model.id || model;
        option.textContent = model.name || model.id || model;
        // Select different models by default for each column
        if (modelIndex === index % availableModels.length) {
          option.selected = true;
        }
        select.appendChild(option);
      });
    });

    console.log('Loaded models:', availableModels);
  } catch (error) {
    console.error('Failed to load models:', error);
    modelSelects.forEach(select => {
      select.textContent = '';
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'Failed to load models';
      select.appendChild(option);
    });
  }
}

function getSelectedModels() {
  return Array.from(modelSelects).map(select => select.value).filter(v => v);
}

function getColumnByIndex(index) {
  return document.querySelector(`[data-index="${index}"]`);
}

function resetColumns() {
  columns.forEach(col => {
    col.classList.remove('active', 'done', 'error');
    const responseText = col.querySelector('.response-text');
    responseText.textContent = '';
  });
}

function appendCharWithAnimation(column, char) {
  const responseText = column.querySelector('.response-text');
  const span = document.createElement('span');
  span.className = 'char';
  span.textContent = char;
  responseText.appendChild(span);

  const content = column.querySelector('.column-content');
  content.scrollTop = content.scrollHeight;
}

function appendTextWithAnimation(column, text) {
  for (const char of text) {
    appendCharWithAnimation(column, char);
  }
}

function showError(column, message) {
  const responseText = column.querySelector('.response-text');
  responseText.textContent = '';
  const errorSpan = document.createElement('span');
  errorSpan.className = 'error-message';
  errorSpan.textContent = message;
  responseText.appendChild(errorSpan);
}

async function submitPrompt() {
  const prompt = promptInput.value.trim();
  if (!prompt) return;

  const models = getSelectedModels();
  if (models.length === 0) {
    alert('Please select at least one model');
    return;
  }

  resetColumns();
  submitBtn.classList.add('loading');
  submitBtn.disabled = true;
  columns.forEach(col => col.classList.add('active'));

  // Track completion per column index
  const completedColumns = new Set();

  try {
    const response = await fetch('/api/council', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, models }),
    });

    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    // Map model ID to column index (models array order matches column order)
    const modelToIndex = {};
    models.forEach((model, idx) => {
      // If same model selected multiple times, we need to track per occurrence
      if (!modelToIndex[model]) {
        modelToIndex[model] = [];
      }
      modelToIndex[model].push(idx);
    });

    // Track how many "done" events we've seen per model
    const modelDoneCount = {};

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';

      for (const part of parts) {
        if (part.startsWith('event: done')) {
          return;
        }

        if (part.startsWith('data: ')) {
          try {
            const payload = JSON.parse(part.slice(6));

            if (payload.error) {
              columns.forEach(col => {
                col.classList.remove('active');
                col.classList.add('error');
                showError(col, 'Error: ' + payload.error);
              });
              return;
            }

            const modelId = payload.model;
            const indices = modelToIndex[modelId];
            if (!indices || indices.length === 0) continue;

            // For models selected multiple times, round-robin the done events
            if (!modelDoneCount[modelId]) modelDoneCount[modelId] = 0;

            // Get the next column index for this model
            const targetIdx = indices[modelDoneCount[modelId] % indices.length];
            const column = getColumnByIndex(targetIdx);
            if (!column) continue;

            if (payload.delta) {
              appendTextWithAnimation(column, payload.delta);
            }

            if (payload.done) {
              column.classList.remove('active');
              column.classList.add('done');
              completedColumns.add(targetIdx);
              modelDoneCount[modelId]++;
            }
          } catch (e) {
            console.error('Parse error:', e);
          }
        }
      }
    }
  } catch (error) {
    console.error('Request failed:', error);
    columns.forEach(col => {
      col.classList.remove('active');
      col.classList.add('error');
      showError(col, 'Connection failed');
    });
  } finally {
    submitBtn.classList.remove('loading');
    submitBtn.disabled = false;
  }
}

// Event listeners
submitBtn.addEventListener('click', submitPrompt);

promptInput.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    submitPrompt();
  }
});

chips.forEach(function(chip) {
  chip.addEventListener('click', function() {
    promptInput.value = chip.dataset.prompt;
    promptInput.classList.add('flash');
    setTimeout(function() {
      promptInput.classList.remove('flash');
    }, 300);
  });
});

// Load models on page load
loadModels();
