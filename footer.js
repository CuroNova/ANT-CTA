// 좌측 상단 고정 CuroNova 크레딧 생성 스크립트
(function() {
  const creditDiv = document.createElement('div');
  creditDiv.innerText = 'made by CuroNova';
  creditDiv.style.position = 'fixed';
  creditDiv.style.left = '20px';
  creditDiv.style.top = '16px';
  creditDiv.style.zIndex = '9999';
  creditDiv.style.color = '#94a3b8';
  creditDiv.style.fontSize = '0.85rem';
  creditDiv.style.fontWeight = '600';
  creditDiv.style.letterSpacing = '0.03em';
  creditDiv.style.textShadow = '0 2px 4px rgba(0, 0, 0, 0.8)';
  creditDiv.style.pointerEvents = 'none';
  document.body.appendChild(creditDiv);
})();
