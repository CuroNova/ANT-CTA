(function() {
  const style = document.createElement('style');
  style.innerHTML = `
    .site-footer {
      position: fixed;
      right: 20px;
      bottom: 16px;
      color: #475569;
      font-size: 0.8rem;
      font-weight: 500;
      letter-spacing: 0.05em;
      pointer-events: none;
      z-index: 9999;
    }
  `;
  document.head.appendChild(style);

  const footer = document.createElement('div');
  footer.className = 'site-footer';
  footer.innerText = 'made by CuroNova';
  document.body.appendChild(footer);
})();
