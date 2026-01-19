const promptInput = document.getElementById('prompt-input');
const submitBtn = document.getElementById('submit-btn');
const chips = document.querySelectorAll('.chip');
const columns = document.querySelectorAll('.council-column');

const columnMap = {
  'gpt-5': document.querySelector('[data-model="gpt-5"]'),
  'claude-sonnet': document.querySelector('[data-model="claude-sonnet"]'),
  'gemini-pro': document.querySelector('[data-model="gemini-pro"]'),
};

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

  // Auto-scroll to bottom
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

  resetColumns();
  submitBtn.classList.add('loading');
  submitBtn.disabled = true;
  columns.forEach(col => col.classList.add('active'));

  try {
    const response = await fetch('/api/council', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

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

            const column = columnMap[payload.model];
            if (!column) continue;

            if (payload.delta) {
              appendTextWithAnimation(column, payload.delta);
            }

            if (payload.done) {
              column.classList.remove('active');
              column.classList.add('done');
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

// Add flash class support to input
promptInput.addEventListener('focus', function() {
  promptInput.classList.add('focused');
});

promptInput.addEventListener('blur', function() {
  promptInput.classList.remove('focused');
});
