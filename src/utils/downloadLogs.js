export function formatLogs(logs) {
  return (logs || [])
    .map((entry, idx) => {
      const [type, msg] = Object.entries(entry || {})[0] || ['UNKNOWN', ''];
      return `${idx + 1}. [${type}] ${msg}`;
    })
    .join('\n');
}

export function downloadLogsAsText(logs, filename = 'literature-logs.txt') {
  const content = formatLogs(logs);
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
