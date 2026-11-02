document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const code = document.getElementById('inviteCode').value;

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    const data = await res.json();

    // 📌 서버 설정 파일(password.json) 로드 실패 시 에러 처리
    if (data.redirectToLogin) {
      alert(data.message); // "암호화 로직에 문제가 생겼습니다!" 경고창 표시
      window.location.href = '/login';
      return;
    }

    if (data.success) {
      // 일회성 로그인 플래그 부여
      sessionStorage.setItem('just_logged_in', 'true');
      window.location.href = '/matching';
    } else {
      const errDiv = document.getElementById('error-msg');
      errDiv.style.display = 'block';
      errDiv.innerText = data.message;
    }
  } catch (err) {
    const errDiv = document.getElementById('error-msg');
    errDiv.style.display = 'block';
    errDiv.innerText = '서버 통신 오류가 발생했습니다.';
  }
});
