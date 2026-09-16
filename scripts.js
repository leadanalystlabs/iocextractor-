/**
 * IOC Extractor - Frontend Logic
 * This script handles user interaction, theme switching, and communication with the Cloudflare Worker.
 */

// --- CONFIGURATION ---
// REPLACE THIS with your actual Cloudflare Worker URL
const WORKER_URL = 'https://your-worker-url.workers.dev/extract';

// --- DOM ELEMENTS ---
const inputText = document.getElementById('inputText');
const extractBtn = document.getElementById('extractBtn');
const resultsDiv = document.getElementById('results');
const loadingIndicator = document.getElementById('loadingIndicator');

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Set up Theme Logic
    const themeToggle = document.createElement('button');
    themeToggle.className = 'theme-toggle';
    themeToggle.innerHTML = '🌙';
    themeToggle.title = 'Toggle Dark Mode';
    document.body.appendChild(themeToggle);

    // Check for saved theme or system preference
    const savedTheme = localStorage.getItem('theme') || 
                      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Toggle theme on button click
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        // Update icon
        themeToggle.innerHTML = newTheme === 'dark' ? '☀️' : '🌙';
    });
});

// --- CORE FUNCTIONS ---

/**
 * Main extraction function triggered by the "Extract" button
 */
extractBtn.addEventListener('click', async () => {
    const rawText = inputText.value.trim();
    
    if (!rawText) {
        alert('Please paste some text to analyze first.');
        return;
    }

    // UI State: Loading
    loadingIndicator.style.display = 'block';
    resultsDiv.innerHTML = ''; // Clear previous results
    extractBtn.disabled = true;

    try {
        // Security: Sanitize input using DOMPurify
        const cleanText = DOMPurify.sanitize(rawText);

        // API Call to Cloudflare Worker
        const response = await fetch(WORKER_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ text: cleanText }),
        });

        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }

        const data = await response.json();
        displayResults(data);

    } catch (error) {
        console.error('Error during extraction:', error);
        resultsDiv.innerHTML = `<p style="color: red; font-weight: bold;">Error: ${error.message}</p>`;
    } finally {
        // UI State: Ready
        loadingIndicator.style.display = 'none';
        extractBtn.disabled = false;
    }
});

/**
 * Renders the extracted IOCs into an HTML table
 * @param {Object} data - The JSON response from the worker
 */
function displayResults(data) {
    if (!data.iocs || data.iocs.length === 0) {
        resultsDiv.innerHTML = '<p>No IOCs found in the provided text.</p>';
        return;
    }

    let html = `<h2>Extracted IOCs (${data.iocs.length})</h2>`;
    html += `
        <table border="1" cellpadding="10">
            <thead>
                <tr>
                    <th>Type</th>
                    <th>Original Value</th>
                    <th>Defanged Value</th>
                    <th>Threat Intelligence</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>`;

    data.iocs.forEach(ioc => {
        // Format Threat Intel for display
        const intelDisplay = ioc.threat_intelligence 
            ? `<small>${ioc.threat_intelligence}</small>` 
            : '<small style="color: #888;">No data</small>';

        html += `
            <tr>
                <td><strong>${ioc.type}</strong></td>
                <td><code>${ioc.value}</code></td>
                <td><code>${ioc.defanged}</code></td>
                <td>${intelDisplay}</td>
                <td>
                    <button class="copy-btn" onclick="copyToClipboard('${ioc.value}')">Copy</button>
                    <button class="copy-btn" onclick="copyToClipboard('${ioc.defanged}')">Defanged</button>
                </td>
            </tr>`;
    });

    html += `</tbody></table>`;
    
    // Inject the HTML and run the highlighter
    resultsDiv.innerHTML = html;
    
    // Trigger Highlight.js for any <code> blocks
    if (window.hljs) {
        hljs.highlightAll();
    }
}

/**
 * Helper to copy text to user clipboard
 * @param {string} text - The text to copy
 */
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        // Visual feedback: brief alert or change button text
        // Since we can't easily change button text without complex logic, 
        // we'll use a simple browser alert for now.
        alert('Copied to clipboard!');
    }).catch(err => {
        console.error('Clipboard error:', err);
    });
}
