// main.js
window.onload = function() {
    var game = new Game();

    var restartpage = document.getElementById('restartPage');
    var restartBtn = document.getElementById('restartBtn');
    var scoreEl = document.getElementById('finalScore');

    // 直接启动游戏（去掉开始页面）
    game.start();

    // 重新开始
    restartBtn.addEventListener('click', function() {
        restartpage.style.display = 'none';
        game.restart();
    });

    // 游戏失败回调
    game.failCallback = function(score) {
        restartpage.style.display = 'flex';
        scoreEl.innerHTML = score;
    };
};