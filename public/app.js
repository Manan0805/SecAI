/* ═══════════════════════════════════════════
   SecAI — Application Logic
   ═══════════════════════════════════════════ */

(function () {
  'use strict';

  // ── DOM refs ──
  const form         = document.getElementById('event-form');
  const generateBtn  = document.getElementById('generate-btn');
  const outputsEl    = document.getElementById('outputs');
  const aemContent   = document.getElementById('aem-content');
  const emailContent = document.getElementById('email-content');
  const toast        = document.getElementById('toast');

  // Required field IDs (guest is optional)
  const REQUIRED = ['eventName', 'eventType', 'eventDate', 'participants', 'leoisticHours', 'eventDescription'];

  // ── Helpers ──

  function getFormData() {
    return {
      eventName:   document.getElementById('eventName').value.trim(),
      eventType:   document.getElementById('eventType').value,
      eventDate:   document.getElementById('eventDate').value,
      guest:       document.getElementById('guest').value.trim(),
      participants: document.getElementById('participants').value.trim(),
      leoisticHours: document.getElementById('leoisticHours').value.trim(),
      eventDescription: document.getElementById('eventDescription').value.trim(),
    };
  }

  function formatMarkdown(text) {
    const div = document.createElement('div');
    div.textContent = text;
    let html = div.innerHTML;
    // Replace *text* with <strong>text</strong>
    html = html.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
    // Replace _text_ with <em>text</em>
    html = html.replace(/_(.*?)_/g, '<em>$1</em>');
    return html;
  }

  function formatDate(iso) {
    if (!iso) return '';
    // iso is usually "YYYY-MM-DD" from <input type="date">
    const [year, month, day] = iso.split('-');
    const d = new Date(year, parseInt(month) - 1, day);
    
    // Check if valid
    if (isNaN(d.getTime())) return iso;

    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  // ── Validation ──

  function validate() {
    let valid = true;
    REQUIRED.forEach(id => {
      const input = document.getElementById(id);
      const errorEl = document.getElementById(id + '-error');
      const field = input.closest('.field');
      if (!input.value.trim()) {
        field.classList.add('invalid');
        if (errorEl) errorEl.textContent = 'This field is required';
        valid = false;
      } else {
        field.classList.remove('invalid');
        if (errorEl) errorEl.textContent = '';
      }
    });
    return valid;
  }

  // Clear errors on input
  REQUIRED.forEach(id => {
    const input = document.getElementById(id);
    input.addEventListener('input', () => {
      const field = input.closest('.field');
      const errorEl = document.getElementById(id + '-error');
      field.classList.remove('invalid');
      if (errorEl) errorEl.textContent = '';
    });
  });

  // ── Backend API Integration ──────────────────────────────────────

  /**
   * Generate the After Event Message via backend.
   * @param {Object} data - Form data
   * @returns {Promise<string>}
   */
  async function generateAfterEventMessage(data) {
    const response = await fetch('/api/generate-aem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Server Error');
    }

    const json = await response.json();
    return json.result;
  }

  /**
   * Generate the Email Draft via backend.
   * @param {Object} data - Form data
   * @returns {Promise<string>}
   */
  async function generateEmailDraft(data) {
    const response = await fetch('/api/generate-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Server Error');
    }

    const json = await response.json();
    return json.result;
  }


  // ── Form submit ──

  let lastData = null;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate()) return;
    lastData = getFormData();
    await runGeneration(lastData);
  });

  async function runGeneration(data) {
    // Show loading
    generateBtn.disabled = true;
    generateBtn.classList.add('loading');

    try {
      const [aem, email] = await Promise.all([
        generateAfterEventMessage(data),
        generateEmailDraft(data),
      ]);

      aemContent.innerHTML = formatMarkdown(aem);
      aemContent.dataset.rawOutput = aem;

      emailContent.innerHTML = formatMarkdown(email);
      emailContent.dataset.rawOutput = email;

      // Reveal outputs
      outputsEl.classList.remove('hidden');
      outputsEl.classList.add('visible');

      // Scroll into view
      outputsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      showToast('Generation failed. Please try again.');
      console.error(err);
    } finally {
      generateBtn.disabled = false;
      generateBtn.classList.remove('loading');
    }
  }

  // ── Copy ──

  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const targetId = btn.dataset.target;
      const targetEl = document.getElementById(targetId);
      const text = targetEl.dataset.rawOutput || targetEl.textContent;
      try {
        await navigator.clipboard.writeText(text);
        btn.classList.add('copied');
        const label = btn.querySelector('.copy-label');
        const prev = label.textContent;
        label.textContent = 'Copied!';
        showToast('Copied to clipboard');
        setTimeout(() => {
          btn.classList.remove('copied');
          label.textContent = prev;
        }, 2000);
      } catch {
        showToast('Copy failed — try selecting manually');
      }
    });
  });

  // ── Regenerate ──

  document.querySelectorAll('.regen-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!lastData) return;
      const type = btn.dataset.type; // 'aem' or 'email'
      btn.disabled = true;

      try {
        let result;
        if (type === 'aem') {
          result = await generateAfterEventMessage(lastData);
          aemContent.innerHTML = formatMarkdown(result);
          aemContent.dataset.rawOutput = result;
        } else {
          result = await generateEmailDraft(lastData);
          emailContent.innerHTML = formatMarkdown(result);
          emailContent.dataset.rawOutput = result;
        }
        showToast('Regenerated successfully');
      } catch {
        showToast('Regeneration failed');
      } finally {
        btn.disabled = false;
      }
    });
  });

  // ── Toast ──

  let toastTimer;
  function showToast(msg) {
    clearTimeout(toastTimer);
    toast.textContent = msg;
    toast.classList.add('show');
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
  }

})();
