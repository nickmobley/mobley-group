/* Catalog assistant demo. It reads public catalog.json in this browser.
   This example is deterministic and does not call an AI model or store messages. */
(() => {
  const form = document.getElementById('catalog-assistant-form');
  if (!form) return;
  const input = document.getElementById('catalog-assistant-input');
  const log = document.getElementById('catalog-assistant-log');
  const samples = document.querySelectorAll('[data-demo-question]');
  const catalog = fetch('catalog.json', { credentials: 'omit' })
    .then(r => { if (!r.ok) throw new Error('Catalog unavailable'); return r.json(); });

  function addMessage(text, by, link) {
    const p = document.createElement('p');
    p.className = 'demo-message ' + by;
    const label = document.createElement('strong');
    label.textContent = by === 'visitor' ? 'You: ' : 'Assistant demo: ';
    p.append(label, document.createTextNode(text));
    if (link) {
      const a = document.createElement('a');
      a.href = link.url;
      a.textContent = link.label;
      p.append(document.createTextNode(' '), a);
    }
    log.append(p);
    log.scrollTop = log.scrollHeight;
  }

  const aliases = {
    'voice-receptionist': ['receptionist', 'answer phones', 'after hours', 'appointment', 'voice'],
    'n8n-automation': ['automation', 'n8n', 'workflow', 'connect apps'],
    'ai-website-assistant': ['chatbot', 'chat bot', 'website chat', 'assistant', 'faq'],
    'missed-call-text-back': ['missed call', 'text back', 'sms', 'phone lead', 'call recovery'],
    'website-builds': ['website', 'web site', 'landing page', 'web design'],
    'social-media-management': ['social media', 'posting', 'content calendar'],
    'branding': ['logo', 'brand', 'visual identity'],
    'creator-operations': ['onlyfans', 'creator', 'subscription creator'],
    'job-tracker': ['job application', 'follow up', 'job tracker', 'job search'],
    'resume-it-support': ['resume', 'cover letter', 'help desk', 'it support'],
    'shipping-preflight': ['shipping', 'package', 'reseller', 'weight', 'dimensions'],
    'sittersheet': ['babysitter', 'nanny', 'childcare', 'sitter'],
    '28-day-reset': ['routine', 'workbook', 'morning', 'habits'],
    'dc-tech-ops': ['data center', 'it operations', 'alert triage', 'runbooks'],
    'homelab-gateway': ['homelab', 'home lab', 'tailscale', 'docker'],
    'briefing-engine': ['briefing', 'reading list', 'decision brief'],
    'private-twin': ['private twin', 'local ai', 'personal assistant']
  };
  const stopwords = new Set(['a','an','and','are','can','do','for','have','help','how','i','in','is','me','my','of','on','or','the','to','we','what','with','you','your','that','this','something','need']);

  function findMatch(question, data) {
    const q = question.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
    const words = q.split(' ').filter(w => w.length > 2 && !stopwords.has(w));
    const items = [...data.services, ...data.products];
    return items.map(item => {
      const terms = [item.name, item.audience, item.outcome, ...(item.includes || []), item.format || ''].join(' ').toLowerCase();
      let score = words.reduce((sum, word) => sum + (terms.includes(word) ? 1 : 0), 0);
      for (const phrase of (aliases[item.id] || [])) if (q.includes(phrase)) score += phrase.includes(' ') ? 5 : 3;
      return { item, score };
    }).sort((a,b) => b.score - a.score)[0];
  }

  async function answer(question) {
    const q = question.trim().slice(0, 180);
    if (!q) return;
    addMessage(q, 'visitor');
    input.value = '';
    if (/who owns|my accounts|your accounts|my data/i.test(q)) {
      addMessage('Client builds are scoped in your accounts, with documentation and handover. The example here reads only the public catalog and stores no message.', 'assistant', { label: 'See service terms →', url: 'services.html' });
      return;
    }
    try {
      const data = await catalog;
      const match = findMatch(q, data);
      if (!match || match.score < 2) {
        addMessage('I cannot match that confidently to a listed offer. The catalog shows all services and products; you can ask for a written scope for a custom need.', 'assistant', { label: 'Browse catalog →', url: 'catalog.html' });
        return;
      }
      const x = match.item;
      const note = x.status === 'pilot_inquiry' ? 'This is a pilot inquiry, so the work and price need a written scope.' :
                   x.status === 'live' ? 'The listing gives the contents and a $' + x.price_usd + ' one-time price.' :
                   'This service starts with a written scope and quote.';
      addMessage(x.name + ' may fit. ' + x.outcome + ' ' + note, 'assistant', { label: x.status === 'live' ? 'View product →' : 'See service →', url: x.url });
    } catch (_) {
      addMessage('The catalog did not load. You can still browse the public list or email the studio.', 'assistant', { label: 'Browse catalog →', url: 'catalog.html' });
    }
  }

  form.addEventListener('submit', e => { e.preventDefault(); answer(input.value); });
  samples.forEach(button => button.addEventListener('click', () => answer(button.dataset.demoQuestion)));
})();