document.getElementById('extractBtn').addEventListener('click', async () => {
  const inputText = document.getElementById('inputText').value.trim();
  if (!inputText) {
    alert('Please paste some text to analyze.');
    return;
  }

  const loadingIndicator = document.getElementById('loadingIndicator');
  loadingIndicator.style.display = 'block';
  document.getElementById('extractBtn').disabled = true;

  try {
    // Sanitize input using DOMPurify
    const cleanText = DOMpurify.sanitize(inputText);

    // Send to Cloudflare Worker for processing
    const response = await fetch('https://your-worker-url.workers.dev/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: cleanText }),
    });

    if (!response.ok) throw new Error(`Error: ${response.status}`);

    const data = await response.json();
    displayResults(data);
  } catch (error) {
    console.error('Error:', error);
    document.getElementById('results').innerHTML =
      `<p style="color: red;">Error processing request: ${error.message}</p>`;
  } finally {
    loadingIndicator.style.display = 'none';
    document.getElementById('extractBtn').disabled = false;
  }
});

function displayResults(data) {
  const resultsDiv = document.getElementById('results');
  if (!data.iocs || data.iocs.length === 0) {
    resultsDiv.innerHTML = '<p>No IOCs found.</p>';
    return;
  }

  let html = `<h2>Extracted IOCs</h2><table border="1" cellpadding="5">`;
  html += `<tr><th>Type</th><th>Value</th><th>Defanged</th><th>Threat Intelligence</th></tr>`;

  data.iocs.forEach(ioc => {
    const threatIntel = ioc.threat_intelligence ? `<p>${ioc.threat_intelligence}</p>` : '<p>No data</p>';
    html += `
      <tr>
        <td>${ioc.type}</td>
        <td><code>${ioc.value}</code></td>
        <td><code>${ioc definitive}</code></td>
        <td>${threatIntel}</td>
        <td>
          <button onclick="copyToClipboard('${ioc.value}')">Copy</button>
          <button onclick="copyToClipboard('${ioc definitive}')">Copy Defanged</button>
        </td>
      </tr>
    `;
  });

  html += `</table>`;
  resultsDiv.innerHTML = html;

  // Highlight hashes in the table
  hljs.highlightAll();
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert('Copied to clipboard!');
  }).catch(err => {
    console.error('Failed to copy:', err);
  });
}
