// マナビー・ドットアドベンチャー - メインスクリプト

// 定数とグローバル変数の定義 -----------------
// マスターテキストリスト
const masterTextList = [
    '写真', 'こんにちは', '寿司', '東京タワー', 'きょうと', 
    'さくら', 'ラーメン', '新幹線', '富士山', 'かわいい',
    'ハロウィンパーティー', 'ドコサヘキサエン酸', '獅子座流星群',
    '石油ファンヒーター', 'コンビニエンスストア', 'アナゴ一本握り',
    'ずいずいずっころばし', 'カリフォルニアロール', 'シンガポールスリング',
    '料理のさしすせそ', '脱いだら脱ぎっぱなし', '味噌ラーメン大盛り',
    '熱帯雨林気候', '伊勢海老食べ放題', 'ジブラルタル海峡',
    '鬼は外、福は内', '立つ鳥跡を濁さず', 'シェフの気まぐれランチ',
    '高気圧と低気圧', '女心と秋の空', 
    '味噌バターコーンラーメン', 'ワレワレハウチュウジンダ', 'スモモも桃も桃のうち',
    '穴あきジーパンは寒い', '人を呪わば穴二つ', 'ホップ、ステップ、ジャンプ',
    '我思う、故に我あり', '生むぎ生ごめ生たまご', '細麺太麺ちぢれ麺',
    'うまい話にゃ裏がある', '晴れた青空、輝く星空', 'ロイヤルストレートフラッシュ',
    'スリジャヤワルダナプラコッテ', 'おじいさんは山へ柴刈りに', 'おばあさんは川へ洗濯に',
    '金の斧ですか銀の斧ですか', '隣の客はよく柿食う客だ', '壁に耳あり障子に目あり',
    '赤巻紙青巻紙黄巻紙', '財布、携帯、鍵、定期', '赤パジャマ青パジャマ黄パジャマ',
    '逆転サヨナラ満塁ホームラン', 'ハイドロプレーニング現象', '天は人の上に人を作らず',
    '抹茶白玉クリームあんみつ', '趣味はお茶とお花とお琴です', '死して屍ひろうものなし',
    '水酸化ナトリウム水溶液', 'タンスの角に小指をぶつけた'
];

const masterHiraTextList = [
    'しゃしん', 'こんにちは', 'すし', 'とうきょうたわー', 'きょうと', 
    'さくら', 'らーめん', 'しんかんせん', 'ふじさん', 'かわいい',
    'はろうぃんぱーてぃー', 'どこさへきさえんさん', 'ししざりゅうせいぐん',
    'せきゆふぁんひーたー', 'こんびにえんすすとあ', 'あなごいっぽんにぎり',
    'ずいずいずっころばし', 'かりふぉルにあろーる', 'しんがぽーるすりんぐ',
    'りょうりのさしすせそ', 'ぬいだらぬぎっぱなし', 'みそらーめんおおもり',
    'ねったいうりんきこう', 'いせえびたべほうだい', 'じぶらるたるかいきょう',
    'おにはそと、ふくはうち', 'たつとりあとをにごさず', 'しぇふのきまぐれらんち',
    'こうきあつとていきあつ', 'おんなごころとあきのそら', 
    'みそばたーこーんらーめん', 'われわれはうちゅうじんだ', 'すもももももももものうち',
    'あなあきじーぱんはさむい', 'ひとをのろわばあなふたつ', 'ほっぷ、すてっぷ、じゃんぷ',
    'われおもう、ゆえにわれあり', 'なまむぎなまごめなまたまご', 'ほそめんふとめんちぢれめん',
    'うまいはなしにゃうらがある', 'はれたあおぞら、かがやくほしぞら', 'ろいやるすとれーとふらっしゅ',
    'すりじゃやわるだなぷらこって', 'おじいさんはやまへしばかりに', 'おばあさんはかわへせんたくに',
    'きんのおのですかぎんのおのですか', 'となりのきゃくはよくかきくうきゃくだ', 'かべにみみありしょうじにめあり',
    'あかまきがみあおまきがみ', 'さいふ、けいたい、かぎ、ていき', 'あかぱじゃまあおぱじゃまきぱじゃま',
    'ぎゃくてんさよならまんるいほーむらん', 'はいどろぷれーにんぐげんしょう', 'てんはひとのうえにひとをつくらず',
    'まっちゃしらたまくりーむあんみつ', 'しゅみはおちゃとおはなとおことです', 'ししてしかばねひろうものなし',
    'すいさんかなとりうむすいようえき', 'たんすのかどにこゆびをぶつけた'
];

// ゲーム用変数
let textList = [];
let hiraTextList = [];
let currentIndex = 0;
let score = 0;
let typingText = null;
let nextBackgroundColor = null;
let gameActive = false;
let startTime = 0;
let timeLeft = 60;
let totalKeystrokes = 0;
let correctKeystrokes = 0;
let timer = null;
let highScore = localStorage.getItem('highScore') || 0;
let comboCount = 0; // コンボカウント追加

// ゲームモード設定
const gameModes = {
    standard: {
        questionCount: 15, // 標準モードを15問に設定
        timeLimit: Infinity, // 時間制限なし
        showElapsedTime: true // 経過時間表示フラグ
    },
    timeAttack: {
        questionCount: 30,
        timeLimit: 120,
        inProgress: true // 準備中フラグ
    },
    endless: {
        questionCount: 999,
        timeLimit: Infinity,
        inProgress: true // 準備中フラグ
    }
};

// 現在のゲームモード
let currentGameMode = 'standard';

// DOM要素キャッシュ
const elements = {
    audio: {
        buttonSound: document.getElementById('button-sound'),
        hitSound: document.getElementById('hit-sound'),
        missSound: document.getElementById('miss-sound'),
        resultSound: document.getElementById('result-sound')
    },
    screens: {
        loadingScreen: document.getElementById('loading-screen'),
        mainMenu: document.getElementById('main-menu'),
        modeSelectScreen: document.getElementById('mode-select-screen'),
        gameScreen: document.getElementById('game-screen'),
        resultScreen: document.getElementById('result-screen')
    },
    game: {
        currentQuestionJp: document.querySelector('.current-question-jp'),
        romajiDisplay: document.querySelector('.romaji-display'),
        scoreElement: document.getElementById('score'),
        currentIndexElement: document.getElementById('current-index'),
        totalTextsElement: document.getElementById('total-texts'),
        typingArea: document.querySelector('.typing-area'),
        timeDisplay: document.getElementById('time'),
        progressFill: document.querySelector('.progress-fill'),
        startPrompt: document.querySelector('.start-prompt'),
        comboDisplay: document.querySelector('.combo-display'),
        comboCount: document.querySelector('.combo-count'),
        comboRank: document.querySelector('.combo-rank')
    },
    result: {
        finalScoreElement: document.getElementById('final-score'),
        newRecordElement: document.getElementById('new-record'),
        keystrokesElement: document.getElementById('keystrokes')
    },
    buttons: {
        playAgainButton: document.getElementById('play-again'),
        backToMenuButton: document.getElementById('back-to-menu'),
        modeButtons: document.querySelectorAll('.mode-button'),
        backToMenuFromMode: document.getElementById('back-to-menu-from-mode')
    }
};

// 初期化と設定 ------------------------------
// ライブラリのロード確認
if (typeof TypingText === 'undefined') {
    console.error('TypingText library is not loaded correctly!');
    alert('タイピングライブラリの読み込みに失敗しました。ページを再読み込みしてください。');
}

// ユーティリティ関数 -----------------------
// 時間フォーマット関数
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// オーディオ関連関数
const audio = {
    playButtonSound() {
        this.playSound(elements.audio.buttonSound);
    },
    
    playHitSound() {
        this.playSound(elements.audio.hitSound);
    },
    
    playMissSound() {
        this.playSound(elements.audio.missSound);
    },
    
    playResultSound() {
        this.playSound(elements.audio.resultSound);
    },
    
    playSound(audioElement) {
        audioElement.currentTime = 0;
        audioElement.play().catch(e => console.warn('Audio play failed:', e));
    }
};

// audioオブジェクトをグローバルに公開
window.audio = audio;

// 画面管理関数
const screenManager = {
    // 画面切り替え関数
    switchToScreen(screen) {
        // ランキング画面が存在する場合、先に処理する
        if (typeof Manaby !== 'undefined' && Manaby.UI && typeof Manaby.UI.switchToScreen === 'function') {
            console.log('新モジュールの画面切り替えを使用');
            return;
        }
        
        console.log('従来の画面切り替え関数を使用');
        // すべての画面を非アクティブにする
        document.querySelectorAll('.screen').forEach(el => {
            el.classList.remove('active');
            el.style.display = 'none'; // 即座に非表示にする
        });
        
        // 新しい画面に.activeクラスを追加
        screen.classList.add('active');
        screen.style.display = 'flex';
    },
    
    // ローディングシミュレーション
    simulateLoading() {
        // 新モジュールが存在する場合はスキップ
        if (typeof Manaby !== 'undefined' && Manaby.App) {
            console.log('新モジュールによるローディング処理を優先');
            return;
        }
        
        console.log('ローディングシミュレーション開始');
        const loadingBarFill = document.querySelector('.loading-bar-fill');
        
        if (!loadingBarFill) {
            console.error('loading-bar-fill要素が見つかりません');
            // 要素が見つからない場合は直接メインメニューに移動
            setTimeout(() => {
                this.switchToScreen(elements.screens.mainMenu);
            }, 1000);
            return;
        }
        
        // ドット絵風のローディングアニメーション処理
        // 初期値設定
        loadingBarFill.style.width = '0%';
        
        // ドット感を出すために、ステップ数を少なくする
        const totalSteps = 24; // ドット的な感覚のステップ数
        let currentStep = 0;
        
        const loadingInterval = setInterval(() => {
            // ステップを進める
            currentStep++;
            
            // 進捗のパーセンテージを計算
            const progress = Math.floor((currentStep / totalSteps) * 100);
            
            // ドット感を出すために整数値に調整
            loadingBarFill.style.width = `${progress}%`;
            console.log('ローディング進行中：', progress);
            
            // ローディングテキストをランダムで点滅
            const loadingText = document.querySelector('.loading-text');
            if (loadingText && Math.random() > 0.7) {
                loadingText.style.opacity = loadingText.style.opacity === '0.5' ? '1' : '0.5';
            }
            
            if (currentStep >= totalSteps) {
                clearInterval(loadingInterval);
                console.log('ローディング完了：100%');
                
                // ピクセル風のローディング完了効果を追加
                const loadingScreen = document.getElementById('loading-screen');
                
                // ピクセル的なスクリーンフラッシュ効果（点滅を2回）
                loadingScreen.style.transition = 'filter 0.1s step-end';
                
                // 一度目の点滅
                loadingScreen.style.filter = 'brightness(1.5)';
                setTimeout(() => {
                    loadingScreen.style.filter = 'brightness(1)';
                    
                    // 二度目の点滅
                    setTimeout(() => {
                        loadingScreen.style.filter = 'brightness(1.5)';
                        
                        setTimeout(() => {
                            loadingScreen.style.filter = 'brightness(1)';
                            
                            // 画面切り替え
                            setTimeout(() => {
                                console.log('メインメニューに移動');
                                this.switchToScreen(elements.screens.mainMenu);
                            }, 200);
                        }, 100);
                    }, 100);
                }, 100);
            }
        }, 120); // より短いインターバルで、ドット感のある動きに
    },
    
    // キー入力処理
    handleKeyDown(e) {
        // ポップアップが表示されている場合は入力を無視
        if (popup.isVisible) return;
        
        // ゲーム画面でのキー入力時にスタートプロンプトを確実に非表示
        if (elements.screens.gameScreen.classList.contains('active') && 
            /^[a-zA-Z]$/.test(e.key) && !gameActive) {
            hideStartPrompt();
        }
        
        // ESCキーとスペースキーはグローバルイベントハンドラで処理
        if (e.key === 'Escape' || (e.key === ' ' && e.target === document.body)) {
            return;
        }
        
        if (!typingText) return;
    
        // バックスペースは入力フィールド以外で許可しない
        if (e.key === 'Backspace') {
            // 入力フィールド内ではバックスペースを許可
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return; // 通常の動作を許可
            }
            e.preventDefault();
            return;
        }
        
        // 入力処理
        if (TypingText.isValidInputKey(e.key)) {
            // 最初のキー入力でスタートプロンプトを非表示
            if (startTime === 0) {
                startTime = Date.now();
                this.startTimer();
                hideStartPrompt();
            }
            
            totalKeystrokes++;
            console.log('キー入力:', e.key);
            const result = typingText.inputKey(e.key);
            console.log('入力結果:', result);
            
            // 即座にDOM更新
            this.updateDisplay();
            
            if (result === 'complete' || result === 'incomplete') {
                // 正しい入力の場合
                correctKeystrokes++;
                
                if (result === 'complete') {
                    // 単語完成時
                    console.log('タイピング完了 - handleWordCompletion呼び出し');
                    this.handleWordCompletion();
                } else {
                    // 正解だがまだ単語が完成していない場合
                    audio.playHitSound(); // 各キー入力正解時に効果音再生
                    comboCount++;
                    updateComboDisplay(comboCount);
                }
            } else if (result === 'unmatch') {
                // 不正解効果音
                audio.playMissSound();
                
                // コンボリセット＆Oops!表示
                comboCount = -1; // ミス表示用に-1にする
                updateComboDisplay(comboCount);
                
                // 背景色を変更
                nextBackgroundColor = 'rgba(255, 0, 0, 0.2)';
            }
        }
    },
    
    // タイマーの開始
    startTimer() {
        if (timer) clearInterval(timer);
        
        const modeConfig = gameModes[currentGameMode];
        
        // エンドレスモードまたは経過時間表示モードの場合
        if (timeLeft === Infinity || modeConfig.showElapsedTime) {
            // 開始時間を記録
            const timerStartTime = Date.now();
            
            timer = setInterval(() => {
                // 経過時間を計算（現在時間 - タイマー開始時間）で計算
                const elapsedSeconds = Math.floor((Date.now() - timerStartTime) / 1000);
                // フォーマットして表示
                elements.game.timeDisplay.textContent = formatTime(elapsedSeconds);
            }, 1000);
            return;
        }
        
        // 通常のカウントダウンタイマー
        timer = setInterval(() => {
            timeLeft--;
            elements.game.timeDisplay.textContent = timeLeft;
            
            // タイマー残り時間が少なくなったら点滅
            if (timeLeft <= 10) {
                elements.game.timeDisplay.parentElement.classList.add('blink');
            }
            
            if (timeLeft <= 0) {
                clearInterval(timer);
                this.finishGame();
            }
        }, 1000);
    },

    // 現在の問題を表示
    showCurrentText() {
        const currentText = hiraTextList[currentIndex];
        
        // お題を表示
        elements.game.currentQuestionJp.textContent = textList[currentIndex];
        
        try {
            // TypingTextオブジェクトを作成
            typingText = new TypingText(currentText);
            
            // ローマ字表示を初期化
            elements.game.romajiDisplay.textContent = typingText.roman;
        } catch (error) {
            console.error('Error creating TypingText:', error);
        }
    },

    // ローマ字表示を更新
    updateDisplay() {
        if (!typingText) return;
        
        // ローマ字の表示を更新
        const completedRomaji = typingText.completedRoman;
        const remainingRomaji = typingText.remainingRoman;
        
        if (elements.game.romajiDisplay) {
            elements.game.romajiDisplay.innerHTML = `<span class="typed-romaji game__typed-text">${completedRomaji}</span>${remainingRomaji}`;
        }
    },
    
    // ゲーム終了
    finishGame(completed = false) {
        // ゲーム状態の更新
        gameActive = false;
        clearInterval(timer);
        
        const modeConfig = gameModes[currentGameMode];
        
        // 経過時間の計算（最低1秒を保証）
        const elapsedTime = Math.max(1, Math.floor((Date.now() - startTime) / 1000));
        const timeString = formatTime(elapsedTime);
        
        // タイピング文字数の計算
        let charsTyped = 0;
        // 完了した文章の文字数を計算（モードによって違う）
        const maxIndex = currentGameMode === 'standard' ? 
                       Math.min(currentIndex, gameModes[currentGameMode].questionCount) :
                       currentIndex;
        
        for (let i = 0; i < maxIndex; i++) {
            if (i < hiraTextList.length) {
                charsTyped += hiraTextList[i].length;
            }
        }
        
        // 現在入力中の文章の進捗も考慮
        if (typingText && currentIndex < hiraTextList.length && currentIndex < gameModes[currentGameMode].questionCount) {
            const progressRatio = typingText.completedText.length / Math.max(1, hiraTextList[currentIndex].length);
            charsTyped += Math.floor(hiraTextList[currentIndex].length * progressRatio);
        }
        
        // 最低でも正しく打ったキーストローク数を使用
        charsTyped = Math.max(charsTyped, correctKeystrokes);
        
        // WPM計算: 入力した文字数 ÷ 入力に要した秒数 × 60
        const wpm = Math.round((charsTyped / elapsedTime) * 60);
        
        // デバッグ情報（開発者コンソールに表示）
        console.log(`WPM計算: 文字数=${charsTyped}, 経過時間=${elapsedTime}秒(${timeString}), correctKS=${correctKeystrokes}, totalKS=${totalKeystrokes}, WPM=${wpm}`);
        console.log(`ゲーム情報: モード=${currentGameMode}, 問題数=${maxIndex}/${gameModes[currentGameMode].questionCount}, 完了=${completed}`);
        
        // 達成率の計算（スタンダードモード用）
        let completionRate = 0;
        if (currentGameMode === 'standard') {
            completionRate = Math.min(100, Math.round((maxIndex / gameModes[currentGameMode].questionCount) * 100));
        }
        
        this.updateResultScreen(score, totalKeystrokes, wpm, timeString, completionRate, completed);
    },
    
    // リザルト画面の更新
    updateResultScreen(score, keystrokes, wpm, timeString, completionRate, completed) {
        // リザルト画面に値を表示
        elements.result.finalScoreElement.textContent = score;
        elements.result.keystrokesElement.textContent = keystrokes;
        document.getElementById('wpm-value').textContent = wpm;
        
        // 既存のクリア時間の行を削除（重複表示を防ぐ）
        const existingTimeStatsRow = document.querySelector('.stats-table tr.time-stats-row');
        if (existingTimeStatsRow) {
            existingTimeStatsRow.remove();
        }
        
        // クリア時間行の作成
        const timeStatsRow = document.createElement('tr');
        timeStatsRow.className = 'time-stats-row';
        const statsTable = document.querySelector('.stats-table');
        
        // クリア時間表示（スタンダードモードの場合のみ）
        if (currentGameMode === 'standard') {
            timeStatsRow.innerHTML = `
                <td class="stat-label">クリア時間：</td>
                <td class="stat-value" id="clear-time">${timeString}</td>
            `;
            timeStatsRow.style.display = 'table-row';
            statsTable.appendChild(timeStatsRow);
        }
        
        // ヘッダータイトルを常に「RESULT」にする
        document.querySelector('.result-header .result-title').textContent = 'RESULT';
        
        // パーフェクトクリア/コンプリート/タイムアップ表示のための要素を検索
        let clearStatusElement = document.querySelector('.result-score .clear-status');
        
        // 要素が存在しない場合は作成
        if (!clearStatusElement) {
            clearStatusElement = document.createElement('div');
            clearStatusElement.className = 'clear-status';
            const resultScoreElement = document.querySelector('.result-score');
            
            // すでに追加済みでなければ追加する
            if (!resultScoreElement.querySelector('.clear-status')) {
                resultScoreElement.appendChild(clearStatusElement);
            }
        }
        
        // PERFECT CLEARは非表示にする
        clearStatusElement.style.display = 'none';
        
        // ハイスコア更新チェック
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('highScore', highScore);
            elements.result.newRecordElement.style.display = 'block';
        } else {
            elements.result.newRecordElement.style.display = 'none';
        }
        
        // リザルト効果音
        audio.playResultSound();
        
        // スコア登録用のセッションIDを生成
        if (typeof Manaby !== 'undefined' && Manaby.Firebase && 
            typeof Manaby.Firebase.generateNewScoreSession === 'function') {
            console.log('スコア登録用の新しいセッションを生成します');
            Manaby.Firebase.generateNewScoreSession();
        }
        
        // 画面切り替え
        setTimeout(() => {
            this.switchToScreen(elements.screens.resultScreen);
        }, 1000);
    },
    
    // ゲームリセット処理
    resetGame() {
        // リセットアニメーションを表示し、終了後にゲームを初期化
        effectsManager.showResetAnimation(() => {
            this.initGame();
        });
    },

    // ピクセルスプラッシュエフェクト生成
    createPixelSplash(container) {
        const colors = ['#FF8C00', '#1A2238', '#0ABDE3', '#FFD700'];
        const pixelCount = 50;
        
        for (let i = 0; i < pixelCount; i++) {
            const pixel = document.createElement('div');
            pixel.className = 'pixel-splash';
            
            // ランダムな位置とサイズ
            const size = Math.floor(Math.random() * 6) + 2; // 2〜8px
            pixel.style.width = `${size}px`;
            pixel.style.height = `${size}px`;
            
            // ランダムな色
            pixel.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            
            // ランダムな位置 - コンテナの中央を基点に
            pixel.style.left = '50%';
            pixel.style.top = '50%';
            
            // ランダムな飛散方向
            const randomX = (Math.random() - 0.5) * 200; // -100px〜100px
            const randomY = (Math.random() - 0.5) * 200; // -100px〜100px
            pixel.style.setProperty('--random-x', `${randomX}px`);
            pixel.style.setProperty('--random-y', `${randomY}px`);
            
            // ランダムなアニメーション遅延
            pixel.style.animationDelay = `${Math.random() * 0.5}s`;
            
            container.appendChild(pixel);
        }
    },

    // ゲーム初期化
    initGame() {
        // ゲーム状態の初期化
        gameActive = true;
        startTime = 0;
        const modeConfig = gameModes[currentGameMode];
        timeLeft = modeConfig.timeLimit;
        currentIndex = 0;
        score = 0;
        totalKeystrokes = 0;
        correctKeystrokes = 0;
        typingText = null;
        nextBackgroundColor = null;
        comboCount = 0;
        
        // コンボ表示を初期化
        elements.game.comboCount.textContent = '0';
        elements.game.comboRank.textContent = 'Ready!';
        removeAllRankClasses(elements.game.comboRank);
        elements.game.comboDisplay.classList.remove('active');
        
        // 問題をランダムに選択
        this.selectRandomQuestions(modeConfig.questionCount);
        
        // UI要素の更新
        elements.game.scoreElement.textContent = score;
        
        // 時間表示の初期化
        if (modeConfig.showElapsedTime) {
            // 経過時間表示モード
            elements.game.timeDisplay.textContent = '00:00';
            elements.game.timeDisplay.parentElement.querySelector('.time-display-label').textContent = 'TIME:';
        } else {
            // カウントダウン表示モード
            elements.game.timeDisplay.textContent = timeLeft === Infinity ? '∞' : timeLeft;
            elements.game.timeDisplay.parentElement.querySelector('.time-display-label').textContent = 'LEFT:';
        }
        
        // 問題数表示の更新
        const totalQuestions = currentGameMode === 'standard' ? 
                            modeConfig.questionCount : 
                            Math.min(textList.length, modeConfig.questionCount);
        elements.game.totalTextsElement.textContent = totalQuestions;
        
        elements.game.currentIndexElement.textContent = currentIndex + 1;
        
        // プログレスバーの初期化
        console.log('プログレスバーの初期化');
        // プログレスバー要素を確実に取得
        elements.game.progressFill = document.querySelector('.progress-fill');
        console.log('progressFill要素:', elements.game.progressFill);
        
        if (elements.game.progressFill) {
            elements.game.progressFill.style.width = '0%';
            // 進行状況クラスをリセット
            elements.game.progressFill.classList.remove('progress-low', 'progress-medium', 'progress-high');
            elements.game.progressFill.classList.add('progress-low');
            console.log('プログレスバー幅を0%に設定');
        } else {
            console.error('progressFill要素が見つかりません');
        }
        
        // スタートプロンプトを表示
        showStartPrompt();
        
        // 最初の問題を表示
        this.showCurrentText();
        
        // レンダリングループの開始 - アロー関数で正しくthisを参照
        requestAnimationFrame(() => this.render());
    },
    
    // 問題をランダムに選択する関数
    selectRandomQuestions(count) {
        // インデックスの配列を作成
        const indices = Array.from(Array(masterTextList.length).keys());
        
        // インデックスをシャッフル
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]]; // 配列の要素を入れ替え
        }
        
        // 必要な数だけインデックスを使って問題を選択
        textList = indices.slice(0, count).map(i => masterTextList[i]);
        hiraTextList = indices.slice(0, count).map(i => masterHiraTextList[i]);
    },

    // ゲーム開始
    startGame() {
        // スタートプロンプトを非表示にする
        hideStartPrompt();
        
        // ゲーム状態の更新
        gameActive = true;
        startTime = Date.now();
        timeLeft = 60;
        currentIndex = 0;
        score = 0;
        totalKeystrokes = 0;
        correctKeystrokes = 0;
        typingText = null;
        nextBackgroundColor = null;
        comboCount = 0;
        
        // 問題を表示
        this.showCurrentText();
    },

    // ゲーム終了後の処理
    handleWordCompletion() {
        const modeConfig = gameModes[currentGameMode];
        
        // 正解効果音
        audio.playHitSound();
        comboCount++; // コンボ増加
        updateComboDisplay(comboCount); // コンボ表示更新
        
        // スコア加算（基本スコア + 文字数ボーナス + コンボボーナス）
        const baseScore = 100;
        const wordBonus = hiraTextList[currentIndex].length * 10;
        const comboBonus = Math.min(comboCount * 5, 100); // 最大100までのコンボボーナス
        const questionScore = baseScore + wordBonus + comboBonus;
        
        score += questionScore;
        elements.game.scoreElement.textContent = score;
        
        // 背景色を変更
        nextBackgroundColor = 'rgba(0, 255, 0, 0.2)';
        
        // 次の問題へ
        currentIndex++;
        elements.game.currentIndexElement.textContent = currentIndex + 1;
        
        // プログレスバーの更新 - ゲームモードに合わせる
        const progress = (currentIndex / modeConfig.questionCount) * 100;
        console.log(`プログレスバー更新: ${progress}%, currentIndex=${currentIndex}, questionCount=${modeConfig.questionCount}`);
        
        // 要素を確実に取得
        if (!elements.game.progressFill) {
            elements.game.progressFill = document.querySelector('.progress-fill');
        }
        
        console.log(`progressFill要素:`, elements.game.progressFill);
        
        if (elements.game.progressFill) {
            // プログレスバーの進行状況に応じてクラスを変更
            elements.game.progressFill.classList.remove('progress-low', 'progress-medium', 'progress-high');
            if (progress < 33) {
                elements.game.progressFill.classList.add('progress-low');
            } else if (progress < 66) {
                elements.game.progressFill.classList.add('progress-medium');
            } else {
                elements.game.progressFill.classList.add('progress-high');
            }
            
            elements.game.progressFill.style.width = `${Math.min(progress, 100)}%`;
            console.log(`バー幅設定後: ${elements.game.progressFill.style.width}`);
        } else {
            console.error('progressFill要素が見つかりません');
        }
        
        // スタンダードモードで全問終了した場合はゲーム完了
        if (currentGameMode === 'standard' && currentIndex >= modeConfig.questionCount) {
            this.finishGame(true); // 完了としてゲーム終了
            return;
        }
        
        // 次の問題を表示するか、新しい問題を生成
        if (currentIndex < textList.length) {
            this.showCurrentText();
        } else {
            // 問題が尽きた場合は追加生成（スタンダードモード以外）
            this.selectRandomQuestions(10);
            this.showCurrentText();
        }
    },
    
    // レンダリングループ（ビジュアルフィードバック用）
    render() {
        if (!gameActive) return;
        
        // 背景色の更新
        if (nextBackgroundColor) {
            const isError = nextBackgroundColor === 'rgba(255, 0, 0, 0.2)';
            
            // タイピングエリアの色と影を設定
            elements.game.typingArea.style.backgroundColor = nextBackgroundColor;
            elements.game.typingArea.style.boxShadow = isError ? 
                '0 0 10px rgba(255, 0, 0, 0.5)' : 
                '0 0 10px rgba(0, 255, 0, 0.5)';
            
            // 色をリセット
            nextBackgroundColor = null;
            
            // 次のフレームで元に戻す
            setTimeout(() => {
                elements.game.typingArea.style.backgroundColor = 'rgba(26, 34, 56, 0.6)';
                elements.game.typingArea.style.boxShadow = 'inset 0 0 10px rgba(0, 0, 0, 0.5)';
            }, 200);
        }
        
        // レンダリングループ継続
        if (gameActive) {
            requestAnimationFrame(() => this.render());
        }
    },

    // メニューに戻る処理
    backToMainMenu() {
        // ゲーム状態の更新
        gameActive = false;
        clearInterval(timer);
        
        // リセットアニメーションを表示し、終了後にメインメニューに遷移
        effectsManager.showResetAnimation(() => {
            this.switchToScreen(elements.screens.mainMenu);
        }, 'BACK TO MENU...');
    }
};

// UI関連関数 ------------------------------
const uiManager = {
    // イベントリスナーの設定
    setupEventListeners() {
        // キーボード入力
        document.addEventListener('keydown', (e) => {
            // ゲーム画面でのキー入力時にスタートプロンプトを確実に非表示
            if (elements.screens.gameScreen.classList.contains('active') && 
                /^[a-zA-Z]$/.test(e.key) && !gameActive) {
                hideStartPrompt();
            }
            
            screenManager.handleKeyDown(e);
        }, {capture: true, passive: false});
        
        // メインメニューのロゴクリック
        document.querySelector('#main-menu .logo').addEventListener('click', () => {
            audio.playButtonSound();
            screenManager.switchToScreen(elements.screens.modeSelectScreen);
        });
        
        // モード選択ボタン
        this.setupModeButtons();
        
        // ナビゲーションボタン
        this.setupNavigationButtons();
        
        // 全てのボタンに効果音を追加
        this.addSoundToAllButtons();
    },
    
    // モード選択ボタンのセットアップ
    setupModeButtons() {
        elements.buttons.modeButtons.forEach(button => {
            button.addEventListener('click', () => {
                const mode = button.dataset.mode;
                
                // 準備中モードの場合、クリックを無効化
                if (gameModes[mode].inProgress) {
                    audio.playMissSound();
                    return;
                }
                
                currentGameMode = mode;
                audio.playButtonSound();
                screenManager.switchToScreen(elements.screens.gameScreen);
                screenManager.initGame();
            });
        });
    },
    
    // ナビゲーションボタンのセットアップ
    setupNavigationButtons() {
        // モード選択画面から戻るボタン
        elements.buttons.backToMenuFromMode.addEventListener('click', () => {
            audio.playButtonSound();
            effectsManager.showResetAnimation(() => {
                screenManager.switchToScreen(elements.screens.mainMenu);
            }, 'BACK TO MENU...');
        });
        
        // ゲームモード選択処理
        elements.buttons.modeButtons.forEach(button => {
            button.addEventListener('click', () => {
                const mode = button.dataset.mode;
                if (gameModes[mode] && !gameModes[mode].inProgress) {
                    audio.playButtonSound();
                    currentGameMode = mode;
                    
                    // 画面切替前にスタートプロンプトを初期化
                    showStartPrompt();
                    
                    screenManager.switchToScreen(elements.screens.gameScreen);
                    screenManager.initGame();
                }
            });
        });
        
        // ゲーム再開ボタン - 同じモードで直接再開
        elements.buttons.playAgainButton.addEventListener('click', () => {
            audio.playButtonSound();
            screenManager.switchToScreen(elements.screens.gameScreen);
            screenManager.initGame(); // 現在のモードで再初期化
        });
        
        // メニューに戻るボタン
        elements.buttons.backToMenuButton.addEventListener('click', () => {
            audio.playButtonSound();
            effectsManager.showResetAnimation(() => {
                screenManager.switchToScreen(elements.screens.mainMenu);
            }, 'BACK TO MENU...');
        });
    },
    
    // 全てのボタンに効果音を追加
    addSoundToAllButtons() {
        document.querySelectorAll('.pixel-button, .mini-button, .mode-button').forEach(button => {
            // すでにクリックイベントが設定されているボタンをスキップ
            if (!button.hasClickSoundListener) {
                button.addEventListener('click', () => audio.playButtonSound());
                button.hasClickSoundListener = true;
            }
        });
    },
    
    // 準備中モードのボタンにクラスを追加
    markInProgressModes() {
        document.querySelectorAll('.mode-button').forEach(button => {
            const mode = button.dataset.mode;
            if (gameModes[mode] && gameModes[mode].inProgress) {
                button.classList.add('in-progress');
            }
        });
    }
};

// アニメーションとエフェクト関連 -----------------------
const effectsManager = {
    // タイピングエフェクト（文字が徐々に表示される）
    addTypingEffect(element, text, delay = 100) {
        let i = 0;
        element.innerHTML = '';
        const cursor = document.createElement('span');
        cursor.className = 'cursor';
        cursor.textContent = '_';
        element.appendChild(cursor);
        
        const typing = setInterval(() => {
            if (i < text.length) {
                if (cursor.previousSibling) {
                    cursor.previousSibling.textContent += text.charAt(i);
                } else {
                    const textNode = document.createTextNode(text.charAt(i));
                    element.insertBefore(textNode, cursor);
                }
                i++;
            } else {
                clearInterval(typing);
            }
        }, delay);
    },
    
    // ピクセルスプラッシュエフェクト生成
    createPixelSplash(container) {
        const colors = ['#FF8C00', '#1A2238', '#0ABDE3', '#FFD700'];
        const pixelCount = 50;
        
        for (let i = 0; i < pixelCount; i++) {
            const pixel = document.createElement('div');
            pixel.className = 'pixel-splash';
            
            // ランダムな位置とサイズ
            const size = Math.floor(Math.random() * 6) + 2; // 2〜8px
            pixel.style.width = `${size}px`;
            pixel.style.height = `${size}px`;
            
            // ランダムな色
            pixel.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            
            // ランダムな位置 - コンテナの中央を基点に
            pixel.style.left = '50%';
            pixel.style.top = '50%';
            
            // ランダムな飛散方向
            const randomX = (Math.random() - 0.5) * 200; // -100px〜100px
            const randomY = (Math.random() - 0.5) * 200; // -100px〜100px
            pixel.style.setProperty('--random-x', `${randomX}px`);
            pixel.style.setProperty('--random-y', `${randomY}px`);
            
            // ランダムなアニメーション遅延
            pixel.style.animationDelay = `${Math.random() * 0.5}s`;
            
            container.appendChild(pixel);
        }
    },
    
    // リセットアニメーション表示
    showResetAnimation(callback, text = 'RESETTING...') {
        // リセットアニメーション表示
        const resetOverlay = document.createElement('div');
        resetOverlay.className = 'reset-overlay';
        
        // ピクセル効果のためのグリッドを追加
        const pixelGrid = document.createElement('div');
        pixelGrid.className = 'pixel-grid';
        resetOverlay.appendChild(pixelGrid);

        // テキスト表示
        const resetText = document.createElement('div');
        resetText.className = 'reset-text';
        resetText.textContent = text;
        resetOverlay.appendChild(resetText);
        
        // ピクセルスプラッシュエフェクト追加
        this.createPixelSplash(resetOverlay);
        
        // 画面に追加
        document.body.appendChild(resetOverlay);
        
        // 効果音
        audio.playButtonSound();
        
        // ミス音も追加
        setTimeout(() => audio.playMissSound(), 200);
        
        // 結果音も追加
        setTimeout(() => audio.playResultSound(), 500);
        
        // アニメーション終了後にコールバック実行
        setTimeout(() => {
            // アニメーションオーバーレイを削除
            resetOverlay.classList.add('fade-out');
            
            // 効果音
            audio.playButtonSound();
            
            // コールバック実行
            if (typeof callback === 'function') {
                callback();
            }
            
            // オーバーレイを完全に削除
            setTimeout(() => {
                document.body.removeChild(resetOverlay);
            }, 500);
        }, 1000);
    }
};

// ポップアップ関連の機能
const popup = {
  // ポップアップの内容設定
  contents: {
    settings: {
      title: '設定',
      html: `
        <div class="popup-section">
          <h4>音量設定</h4>
          <div class="settings-row" style="margin-top: 12px;">
            <label for="volume-control" style="display: block; margin-bottom: 8px;">効果音の音量:</label>
            <div style="display: flex; align-items: center; width: 100%; background-color: rgba(0,0,0,0.2); padding: 10px; border-radius: 6px;">
              <input type="range" id="volume-control" min="0" max="100" value="80" style="flex: 1;">
              <span id="volume-value" style="width: 45px; text-align: center; margin-left: 10px; background-color: rgba(255,140,0,0.2); padding: 4px; border-radius: 4px; color: var(--primary); border: 1px solid var(--primary);">80%</span>
            </div>
          </div>
          <div class="settings-row" style="margin-top: 15px; display: flex; align-items: center; background-color: rgba(0,0,0,0.2); padding: 10px; border-radius: 6px;">
            <label style="display: flex; align-items: center; cursor: pointer;">
              <input type="checkbox" id="sound-toggle" checked style="margin-right: 10px; width: 18px; height: 18px;">
              <span>効果音を有効にする</span>
            </label>
          </div>
        </div>
        <div class="popup-section">
          <h4>表示設定</h4>
          <div class="settings-row" style="margin-top: 12px; display: flex; align-items: center; background-color: rgba(0,0,0,0.2); padding: 10px; border-radius: 6px;">
            <label style="display: flex; align-items: center; cursor: pointer;">
              <input type="checkbox" id="crt-effect" checked style="margin-right: 10px; width: 18px; height: 18px;">
              <span>CRTエフェクトを表示</span>
            </label>
          </div>
        </div>
      `
    },
    howto: {
      title: '遊び方',
      html: `
        <div class="popup-section">
          <p>画面に表示される日本語をローマ字入力で打ち込もう！速く正確に入力して高得点を目指そう！</p>
          <div class="game-modes" style="margin-top: 12px;">
            <p><strong style="color: var(--gold);">スタンダード:</strong> 全問クリアを目指そう</p>
            <p><strong style="color: var(--gold);">タイムアタック:</strong> 制限時間内で高得点に挑戦</p>
            <p><strong style="color: var(--gold);">エンドレス:</strong> 時間無制限のチャレンジ</p>
          </div>
        </div>
        <div class="popup-section" style="margin-top: 8px;">
          <h4>ショートカット</h4>
          <table style="width: 100%; margin-top: 5px; border-collapse: separate; border-spacing: 0 5px;">
            <tr>
              <td style="width: 35%; text-align: right; padding-right: 15px;">
                <span class="shortcut-key" style="background-color: rgba(255,140,0,0.2); padding: 4px 8px; border-radius: 4px; color: var(--primary); border: 1px solid var(--primary);">ESCキー</span>
              </td>
              <td style="width: 65%;">
                <span class="shortcut-desc">メニューに戻る</span>
              </td>
            </tr>
            <tr>
              <td style="width: 35%; text-align: right; padding-right: 15px;">
                <span class="shortcut-key" style="background-color: rgba(255,140,0,0.2); padding: 4px 8px; border-radius: 4px; color: var(--primary); border: 1px solid var(--primary);">スペースキー</span>
              </td>
              <td style="width: 65%;">
                <span class="shortcut-desc">リスタート</span>
              </td>
            </tr>
            <tr>
              <td style="width: 35%; text-align: right; padding-right: 15px;">
                <span class="shortcut-key" style="background-color: rgba(255,140,0,0.2); padding: 4px 8px; border-radius: 4px; color: var(--primary); border: 1px solid var(--primary);">任意のキー</span>
              </td>
              <td style="width: 65%;">
                <span class="shortcut-desc">ゲームスタート</span>
              </td>
            </tr>
          </table>
        </div>
      `
    },
    credits: {
      title: 'クレジット',
      html: `
        <div class="popup-section">
          <h4>制作</h4>
          <p>
            <span class="credit-label" style="color: var(--gold); display: inline-block; width: 120px;">カフェイン中毒</span>
            <span class="credit-role" style="display: inline-block; color: var(--text-light);">Game Director</span>
          </p>
          <p>
            <span class="credit-label" style="color: var(--gold); display: inline-block; width: 120px;">Claude</span>
            <span class="credit-role" style="display: inline-block; color: var(--text-light);">Programming Assistant</span>
          </p>
        </div>
        <div class="popup-section">
          <h4>アセット</h4>
          <p>
            <span class="credit-label" style="color: var(--primary); display: inline-block; width: 80px;">ドット絵:</span>
            <span class="credit-value">manaby characters</span>
          </p>
          <p>
            <span class="credit-label" style="color: var(--primary); display: inline-block; width: 80px;">効果音:</span>
            <span class="credit-value">Various Sources</span>
          </p>
        </div>
        <div class="popup-section">
          <p class="credit-note" style="text-align: center; margin-top: 15px;">
            ©︎ 2023 manaby All Rights Reserved.
          </p>
        </div>
      `
    },
    manabykun: {
      title: 'まなびーくん',
      html: `
        <div class="popup-section">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="flex: 1;">
              <h4>まなびーくん</h4>
              <p>ここはマナビー王国！僕はみんなのIT学習をサポートするヒーロー、まなびーくんだよ！</p>
              <p>就労移行支援manabyの世界で、楽しく学びながらスキルアップしていこう！</p>
              <p>困ったことがあったら、いつでも僕を呼んでね！</p>
            </div>
            <div class="popup-mascot-image">
              <img src="png/manabymario.png" alt="まなびーくん" class="popup-mascot" style="width: 160px; max-width: 100%; height: auto;">
            </div>
          </div>
        </div>
        <div class="popup-section">
          <h4>まなびーくんのプロフィール</h4>
          <div class="mascot-profile" style="margin-top: 12px;">
            <div class="profile-item" style="margin-bottom: 8px; display: flex;">
              <span class="profile-label" style="color: var(--primary); display: inline-block; width: 100px; text-align: right; padding-right: 15px;">特技:</span>
              <span class="profile-value" style="flex: 1;">ジャンプ、タイピング、PC操作のサポート</span>
            </div>
            <div class="profile-item" style="margin-bottom: 8px; display: flex;">
              <span class="profile-label" style="color: var(--primary); display: inline-block; width: 100px; text-align: right; padding-right: 15px;">好きなもの:</span>
              <span class="profile-value" style="flex: 1;">新しい技術、冒険、ブラックコーヒー</span>
            </div>
            <div class="profile-item" style="display: flex;">
              <span class="profile-label" style="color: var(--primary); display: inline-block; width: 100px; text-align: right; padding-right: 15px;">口癖:</span>
              <span class="profile-value" style="flex: 1;">「死ぬ～」</span>
            </div>
          </div>
        </div>
      `
    }
  },
  
  // 状態管理変数
  isVisible: false,
  
  // DOM要素とイベントリスナーはDOMContentLoadedイベントの中で初期化
  init: function() {
    console.log('ポップアップ初期化を開始します');
    
    // DOM上にポップアップ要素が存在するか確認し、なければ作成
    let overlay = document.getElementById('popup-overlay');
    if (!overlay) {
      console.log('ポップアップのDOM要素が見つからないため、作成します');
      const popupHTML = `
        <div id="popup-overlay" class="popup-overlay">
          <div id="retro-popup" class="retro-popup">
            <div class="popup-header">
              <h3 id="popup-title">タイトル</h3>
              <button id="popup-close" class="popup-close-btn">×</button>
            </div>
            <div id="popup-content" class="popup-content">
              コンテンツはここに表示されます
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', popupHTML);
    }
    
    // DOM要素を参照
    this.overlay = document.getElementById('popup-overlay');
    this.container = document.getElementById('retro-popup');
    this.title = document.getElementById('popup-title');
    this.content = document.getElementById('popup-content');
    this.closeBtn = document.getElementById('popup-close');
    
    if (!this.overlay || !this.container || !this.title || !this.content || !this.closeBtn) {
      console.error('ポップアップの初期化に失敗: 必要なDOM要素が見つかりません');
      return;
    }
    
    // 閉じるボタンのイベント
    this.closeBtn.addEventListener('click', () => this.hide());
    
    // オーバーレイクリックで閉じる
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.hide();
    });
    
    console.log('ポップアップの初期化が完了しました');
  },
  
  // ポップアップを表示
  show: function(type) {
    // 初期化されていない場合は初期化する
    if (!this.overlay || !this.title || !this.content) {
      console.log('ポップアップが初期化されていないため、初期化します');
      this.init();
    }
    
    // それでも初期化に失敗した場合
    if (!this.overlay || !this.title || !this.content) {
      console.error('ポップアップの初期化に失敗しました');
      return;
    }
    
    // ポップアップタイプに応じた内容を設定
    const content = this.contents[type];
    if (!content) {
      console.error(`未定義のポップアップタイプ: ${type}`);
      return;
    }
    
    this.title.textContent = content.title;
    this.content.innerHTML = content.html;
    
    // 設定画面の場合の追加処理
    if (type === 'settings') {
      // 音量スライダーの処理
      const volumeControl = document.getElementById('volume-control');
      const volumeValue = document.getElementById('volume-value');
      
      if (volumeControl && volumeValue) {
        volumeControl.addEventListener('input', function() {
          volumeValue.textContent = `${this.value}%`;
          // ここに音量変更のロジックを追加
        });
      }
    }
    
    // ポップアップを表示
    this.overlay.classList.add('active');
    this.isVisible = true;
    this.playButtonSound();
    
    // フォーカスを閉じるボタンに設定（アクセシビリティ）
    setTimeout(() => {
      if (this.closeBtn) this.closeBtn.focus();
    }, 100);
  },
  
  // ポップアップを閉じる
  hide: function() {
    if (!this.overlay) return;
    
    this.overlay.classList.remove('active');
    this.isVisible = false;
    this.playButtonSound();
  },
  
  // ボタン効果音
  playButtonSound: function() {
    try {
      if (elements && elements.sounds && elements.sounds.button) {
        elements.sounds.button.currentTime = 0;
        elements.sounds.button.play().catch(err => console.log('音声再生エラー:', err));
      } else if (elements && elements.audio && elements.audio.buttonSound) {
        elements.audio.buttonSound.currentTime = 0;
        elements.audio.buttonSound.play().catch(err => console.log('音声再生エラー:', err));
      }
    } catch (error) {
      console.log('効果音の再生に失敗しました:', error);
    }
  }
};

// コンボに応じたランクテキストを取得する関数
function getRankText(combo) {
    if (combo === -1) return 'Oops!';
    if (combo <= 0) return 'Ready!';
    if (combo <= 2) return 'Good!';
    if (combo <= 4) return 'Nice!';
    if (combo <= 6) return 'Great!';
    if (combo <= 8) return 'Awesome!';
    if (combo <= 10) return 'Excellent!';
    if (combo <= 15) return 'Unstoppable!';
    if (combo <= 20) return 'Legendary!';
    return 'Godlike!';
}

// 全ランククラスを削除する関数
function removeAllRankClasses(element) {
    element.classList.remove('oops', 'good', 'nice', 'great', 'awesome', 'excellent', 'unstoppable', 'legendary', 'godlike');
}

// 初期化時にドットグリッドを作成する関数
function initDotGrid() {
    const dotGrid = document.querySelector('.combo-dot-grid');
    if (!dotGrid) return;
    
    // グリッドをクリア
    dotGrid.innerHTML = '';
    
    // 20x10のブロックグリッドを作成（横長にして左右に広がるエフェクト用）
    const columns = 20;
    const rows = 10;
    const totalBlocks = columns * rows;
    
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
            const block = document.createElement('div');
            block.className = 'combo-dot';
            // インデックスとx,y座標を保存
            block.dataset.index = row * columns + col;
            block.dataset.x = col;
            block.dataset.y = row;
            // 中央からの距離を計算して格納
            const centerX = columns / 2;
            const centerY = rows / 2;
            const distanceFromCenter = Math.sqrt(
                Math.pow(col - centerX, 2) + 
                Math.pow(row - centerY, 2)
            );
            block.dataset.distance = distanceFromCenter.toFixed(2);
            dotGrid.appendChild(block);
        }
    }
}

// ピクセルエフェクトを初期化する関数
function initPixelEffect() {
    const container = document.querySelector('.pixel-effect-container');
    if (!container) return;
    
    // コンテナをクリア
    container.innerHTML = '';
    
    // ピクセル数を設定（少なめにしてパフォーマンスを確保）
    const totalPixels = 120;
    
    // 中央から広がる形で配置するためのデータを準備
    const centerX = 50; // コンテナの中央 (%)
    const centerY = 50; // コンテナの中央 (%)
    
    // ピクセルの最大距離（中央からの）
    const maxDistance = 40; // 最大で中央から40%の距離まで
    
    // 中央から放射状に広がるようなポジションを計算
    for (let i = 0; i < totalPixels; i++) {
        // 角度をランダムに (0-360度)
        const angle = Math.random() * Math.PI * 2;
        
        // ランダムな距離（中央寄りに多く配置するため平方根を使用）
        const distance = Math.sqrt(Math.random()) * maxDistance;
        
        // 位置を計算（%）
        const x = centerX + Math.cos(angle) * distance;
        const y = centerY + Math.sin(angle) * distance;
        
        // レトロゲーム風の小さなピクセルを作成
        const pixel = document.createElement('div');
        pixel.className = 'pixel-particles';
        pixel.style.left = `${x}%`;
        pixel.style.top = `${y}%`;
        
        // ランダムなサイズのばらつき（7-9px）
        const size = 7 + Math.floor(Math.random() * 3);
        pixel.style.width = `${size}px`;
        pixel.style.height = `${size}px`;
        
        // 中央からの距離を格納
        pixel.dataset.distance = distance.toFixed(2);
        
        container.appendChild(pixel);
    }
}

// ピクセルエフェクトを更新する関数
function updatePixelEffect(combo, rankText) {
    const container = document.querySelector('.pixel-effect-container');
    if (!container) return;
    
    // ピクセルがなければ初期化
    if (container.children.length === 0) {
        initPixelEffect();
    }
    
    // 全ピクセル取得
    const pixels = Array.from(container.querySelectorAll('.pixel-particles'));
    
    // ミスまたはコンボなしの場合はリセット
    if (combo <= 0) {
        pixels.forEach(pixel => {
            pixel.classList.remove('active', 'blink', 'good', 'nice', 'great', 'awesome', 'excellent', 'unstoppable', 'legendary', 'godlike');
        });
        container.classList.remove('godlike');
        return;
    }
    
    // ランクに応じたクラス名
    let rankClass = '';
    if (combo <= 2) rankClass = 'good';
    else if (combo <= 4) rankClass = 'nice';
    else if (combo <= 6) rankClass = 'great';
    else if (combo <= 8) rankClass = 'awesome';
    else if (combo <= 10) rankClass = 'excellent';
    else if (combo <= 15) rankClass = 'unstoppable';
    else if (combo <= 20) rankClass = 'legendary';
    else rankClass = 'godlike';
    
    // コンボに基づいて表示するピクセルの範囲を決定
    // コンボが大きいほど、広範囲のピクセルが表示される
    const threshold = Math.min(40, combo * 1.5); // 最大距離40%
    
    // 中央からの距離でソート
    pixels.sort((a, b) => {
        return parseFloat(a.dataset.distance) - parseFloat(b.dataset.distance);
    });
    
    // 各ピクセルの状態更新
    pixels.forEach(pixel => {
        // 全ピクセルからクラスを削除してリセット
        pixel.className = 'pixel-particles';
        
        // 中央からの距離が閾値以下なら表示
        const distance = parseFloat(pixel.dataset.distance);
        if (distance <= threshold) {
            // ランク特有のクラスを追加
            pixel.classList.add('active', rankClass);
            
            // Godlike!状態の場合は点滅エフェクト
            if (rankClass === 'godlike') {
                pixel.classList.add('blink');
            }
        }
    });
    
    // Godlike!状態のコンテナ全体効果
    if (rankClass === 'godlike') {
        container.classList.add('godlike');
    } else {
        container.classList.remove('godlike');
    }
}

// コンボ表示を更新する関数
function updateComboDisplay(combo) {
    // 前回のランク
    const prevRankText = elements.game.comboRank.textContent || 'Ready!';
    
    // ランクテキストを取得
    const rankText = getRankText(combo);
    
    // ランクが変わったかチェック
    const rankChanged = prevRankText !== rankText;
    
    if (combo === -1) {
        // ミス時：マイナススコアを表示して構造を維持
        elements.game.comboCount.style.visibility = 'visible';
        elements.game.comboCount.textContent = "-10";
        elements.game.comboCount.style.color = '#ff5252'; // 赤色でマイナスを強調
        
        // スタイルをリセットして、CSSで定義されたサイズを使用
        elements.game.comboCount.style.fontSize = '28px';
        elements.game.comboRank.style.fontSize = '20px';
    } else {
        // 通常時：数字表示、通常のサイズ
        elements.game.comboCount.style.visibility = 'visible';
        elements.game.comboCount.textContent = combo;
        elements.game.comboCount.style.color = 'var(--gold)'; // 通常の金色
        
        // スタイルをリセットして、CSSで定義されたサイズを使用
        elements.game.comboCount.style.fontSize = '28px';
        elements.game.comboRank.style.fontSize = '20px';
    }
    
    // 共通の高さと配置を設定
    elements.game.comboRank.style.height = '30px';
    elements.game.comboRank.style.marginTop = '0px';
    
    // ランクテキストを更新
    elements.game.comboRank.textContent = rankText;
    
    // クラスをリセットして新しいクラスを追加
    removeAllRankClasses(elements.game.comboRank);
    
    // ピクセルエフェクト更新
    updatePixelEffect(combo, rankText);
    
    // コンボ波紋エフェクト
    const comboRipple = document.querySelector('.combo-ripple');
    
    // コンボが上がるたびに波紋エフェクトをトリガー（高コンボでも常に表示）
    if (combo > 0) {
        if (comboRipple) {
            // 現在のアニメーションをリセット
            comboRipple.classList.remove('active');
            // 強制的に再フロー（要素の再描画を促す）
            void comboRipple.offsetWidth;
            // アニメーションを再適用
            comboRipple.classList.add('active');
        }
    }
    
    // コンボ数に応じたクラスを追加
    if (combo === -1) {
        elements.game.comboRank.classList.add('oops');
    } else if (combo <= 2 && combo > 0) {
        elements.game.comboRank.classList.add('good');
    } else if (combo <= 4) {
        elements.game.comboRank.classList.add('nice');
    } else if (combo <= 6) {
        elements.game.comboRank.classList.add('great');
    } else if (combo <= 8) {
        elements.game.comboRank.classList.add('awesome');
    } else if (combo <= 10) {
        elements.game.comboRank.classList.add('excellent');
    } else if (combo <= 15) {
        elements.game.comboRank.classList.add('unstoppable');
    } else if (combo <= 20) {
        elements.game.comboRank.classList.add('legendary');
    } else if (combo > 20) {
        elements.game.comboRank.classList.add('godlike');
    }
    
    // 表示をアクティブにする（Ready!のときは非表示）
    if (combo === -1 || combo > 0) {
        elements.game.comboDisplay.classList.add('active');
    } else {
        // コンボが0の場合は非表示
        elements.game.comboDisplay.classList.remove('active');
    }
}

// 初期化後にピクセルエフェクトを作成
document.addEventListener('DOMContentLoaded', function() {
    // 既存の初期化コード...
    
    // ピクセルエフェクトを初期化
    initPixelEffect();
});

// 初期化後にドットグリッドを作成
document.addEventListener('DOMContentLoaded', function() {
    // 既存の初期化コード...
    
    // ドットグリッドを初期化
    initDotGrid();
});

// スタートプロンプトを非表示にする関数
function hideStartPrompt() {
  const startPrompt = document.querySelector('.start-prompt');
  if (startPrompt) {
    startPrompt.style.display = 'none';
    startPrompt.style.visibility = 'hidden';
    startPrompt.style.opacity = '0';
  }
}

// スタートプロンプトを表示する関数
function showStartPrompt() {
  const startPrompt = document.querySelector('.start-prompt');
  if (startPrompt) {
    startPrompt.style.display = 'flex';
    startPrompt.style.visibility = 'visible';
    startPrompt.style.opacity = '1';
  }
}

// アプリケーション初期化 ------------------
function initApp() {
    // イベントリスナーの設定
    if (uiManager && typeof uiManager.setupEventListeners === 'function') {
        uiManager.setupEventListeners();
    }
    
    // 準備中モードのボタンにクラスを追加
    if (uiManager && typeof uiManager.markInProgressModes === 'function') {
        uiManager.markInProgressModes();
    }
    
    // ローディング画面表示
    if (screenManager && typeof screenManager.simulateLoading === 'function') {
        screenManager.simulateLoading();
    }
}

// アプリケーション起動
initApp();

// DOM読み込み完了時の処理
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded イベントが発生しました');
    
    // ポップアップの初期化（DOMContentLoadedイベント内で行う）
    try {
        console.log('ポップアップを初期化します');
        popup.init();
        console.log('ポップアップの初期化が完了しました');
    } catch (error) {
        console.error('ポップアップの初期化中にエラーが発生しました:', error);
    }
    
    // メニューボタンのイベント
    console.log('メニューボタンにイベントリスナーを追加します');
    const settingsButton = document.getElementById('settings-button');
    const howtoButton = document.getElementById('howto-button');
    const creditsButton = document.getElementById('credits-button');
    
    console.log('設定ボタン:', settingsButton ? '存在します' : '存在しません');
    console.log('遊び方ボタン:', howtoButton ? '存在します' : '存在しません');
    console.log('クレジットボタン:', creditsButton ? '存在します' : '存在しません');
    
    if (settingsButton) {
        settingsButton.addEventListener('click', function() {
            console.log('設定ボタンがクリックされました');
            popup.show('settings');
            if (audio && typeof audio.playButtonSound === 'function') {
                audio.playButtonSound();
            }
        });
    }
    
    if (howtoButton) {
        howtoButton.addEventListener('click', function() {
            console.log('遊び方ボタンがクリックされました');
            popup.show('howto');
            if (audio && typeof audio.playButtonSound === 'function') {
                audio.playButtonSound();
            }
        });
    }
    
    if (creditsButton) {
        creditsButton.addEventListener('click', function() {
            console.log('クレジットボタンがクリックされました');
            popup.show('credits');
            if (audio && typeof audio.playButtonSound === 'function') {
                audio.playButtonSound();
            }
        });
    }
    
    // 以下既存の処理は残す
    // 新モジュールが存在する場合は、追加のイベントリスナーはスキップする
    if (typeof Manaby !== 'undefined' && Manaby.UI && typeof Manaby.UI.setupEventListeners === 'function') {
        console.log('新モジュールのイベントリスナー設定を優先します');
    } else {
        console.log('従来のDOM初期化処理を実行');
    
        // まなびーくんのクリックイベント
        const manabykun = document.getElementById('manabykun-container');
        if (manabykun) {
            manabykun.addEventListener('click', () => {
                popup.show('manabykun');
                if (audio && typeof audio.playButtonSound === 'function') {
                    audio.playButtonSound();
                }
            });
        }
        
        // ローディングシミュレーション開始
        if (screenManager && typeof screenManager.simulateLoading === 'function') {
            screenManager.simulateLoading();
        }
        
        // ゲームの初期化
        if (typeof initGame === 'function') {
            initGame();
        }
        
        // マスコットクリックのイベントリスナー
        const mascot = document.querySelector('[data-type="mascot"]');
        if (mascot) {
            mascot.addEventListener('click', function() {
                if (typeof showProfile === 'function') {
                    showProfile();
                } else {
                    popup.show('manabykun');
                }
            });
        }
        
        // メインロゴクリックイベント
        const logo = document.querySelector('.logo.pulse');
        if (logo) {
            logo.addEventListener('click', function() {
                // 旧来の方法でスクリーン切り替え
                if (audio && typeof audio.playButtonSound === 'function') {
                    audio.playButtonSound();
                }
                if (screenManager && typeof screenManager.switchToScreen === 'function' && 
                    elements && elements.screens && elements.screens.modeSelectScreen) {
                    screenManager.switchToScreen(elements.screens.modeSelectScreen);
                }
            });
        }
        
        // その他のイベントリスナー設定
        // (省略) 既存コードが続く...
    }
});

// ゲームロジックをModuleで置き換えるための調整
window.addEventListener('load', function() {
    // 新モジュールが存在する場合、グローバル変数をエクスポート
    if (typeof Manaby !== 'undefined') {
        // マスターテキストリストをグローバルに公開
        window.masterTextList = masterTextList;
        window.masterHiraTextList = masterHiraTextList;
        
        console.log('ゲームデータを新モジュールに引き継ぎました');
    }
});

// テーマ切り替え機能
document.addEventListener('DOMContentLoaded', function() {
  const themeButton = document.getElementById('switch-theme');
  
  if (themeButton) {
    themeButton.addEventListener('click', function() {
      toggleTheme();
    });
  }
  
  // localStorageからテーマ設定を取得
  const currentTheme = localStorage.getItem('theme') || 'orange';
  setTheme(currentTheme);
});

// テーマを切り替える関数
function toggleTheme() {
  const currentTheme = localStorage.getItem('theme') || 'orange';
  const newTheme = currentTheme === 'orange' ? 'blue' : 'orange';
  
  setTheme(newTheme);
  localStorage.setItem('theme', newTheme);
  
  // 効果音を再生
  const buttonSound = document.getElementById('button-sound');
  if (buttonSound) {
    buttonSound.currentTime = 0;
    buttonSound.play();
  }
}

// テーマを設定する関数
function setTheme(theme) {
  console.log('テーマ設定: ' + theme);
  
  // テーマ属性を設定
  document.body.setAttribute('data-theme', theme);
  console.log('data-theme 属性を設定: ' + theme);
  
  // まず既存のテーマスタイルシートを探す
  let stylesheet = document.getElementById('theme-stylesheet');
  
  // 強制的に再読み込み
  if (stylesheet) {
    stylesheet.remove();
    console.log('既存のスタイルシートを削除しました');
  }
  
  // 新しいスタイルシートを作成
  stylesheet = document.createElement('link');
  stylesheet.id = 'theme-stylesheet';
  stylesheet.rel = 'stylesheet';
  stylesheet.href = 'style.css?v=' + Date.now();
  console.log('新しいスタイルシートを作成: ' + stylesheet.href);
  
  // headに追加
  document.head.appendChild(stylesheet);
  
  // ブルーテーマ適用時は特別な処理を追加
  if (theme === 'blue') {
    // 明示的にbodyの背景色も設定（優先度を上げるため）
    document.body.style.backgroundColor = '#04142B';
    console.log('bodyの背景色を直接設定: #04142B');
  } else {
    // オレンジテーマに戻す場合は直接スタイルを削除
    document.body.style.backgroundColor = '';
    console.log('bodyの直接スタイルを削除');
  }
  
  // テーマ設定をローカルストレージに保存
  localStorage.setItem('theme', theme);
  
  // テーマ切り替えボタンのテキストを更新
  const themeButton = document.getElementById('switch-theme');
  if (themeButton) {
    themeButton.textContent = theme === 'blue' ? 'オレンジテーマに切り替え' : 'ブルーテーマに切り替え';
    console.log('テーマボタンのテキストを更新');
  }
  
  // 設定ポップアップ内のラベルも更新
  const themeLabel = document.getElementById('current-theme-label');
  if (themeLabel) {
    themeLabel.textContent = theme === 'orange' ? 'オレンジ' : 'ブルー';
  }
}

// DOMContentLoaded イベントリスナー（シンプルな初期化）
document.addEventListener('DOMContentLoaded', function() {
    // テーマの初期化などの処理をここに記述
});

// BEM移行のためのコード
// DOMContentLoadedイベントリスナー（シンプルな初期化）
document.addEventListener('DOMContentLoaded', function() {
    // テーマの初期化などの処理をここに記述
    
    // BEMクラス自動適用
    applyBEMClasses();
});

// 古いクラス名→新BEMクラス名のマッピング
const bemClassMap = {
    // ボタン関連
    'pixel-button': 'button button--pixel',
    'mini-button': 'button button--mini',
    'gold-button': 'button button--gold',
    'back-button': 'button button--back',
    'mode-button': 'button button--mode',
    
    // レイアウト/構造関連
    'menu-content': 'menu__content',
    'game-container': 'game__container',
    'arcade-bezel': 'game__bezel',
    'game-header': 'game__header',
    'game-area': 'game__area',
    'result-content': 'result__content',
    'result-inner': 'result__inner',
    'result-header': 'result__header',
    'result-title': 'result__title',
    'mode-select-content': 'mode__content',
    'mode-header': 'mode__header',
    'mode-title': 'mode__title',
    'mode-options': 'mode__options',
    
    // 表示要素関連
    'question-display': 'game__question',
    'current-question-jp': 'game__question-text',
    'romaji-display': 'game__romaji',
    'combo-display': 'game__combo',
    'combo-container': 'game__combo-container',
    'combo-count': 'game__combo-count',
    'combo-rank': 'game__combo-rank',
    'typed-romaji': 'game__typed-romaji',
    'start-prompt': 'game__start-prompt',
    
    // 結果画面関連
    'result-score': 'result__score',
    'result-stats': 'result__stats',
    'score-label': 'result__score-label',
    'final-score': 'result__final-score',
    'new-record': 'result__new-record',
    'clear-status': 'result__clear-status',
    'action-buttons': 'result__actions',
    
    // プログレス関連
    'progress-bar-container': 'progress__container',
    'progress-bar': 'progress__bar',
    'progress-fill': 'progress__fill',
    'progress-text-container': 'progress__text-container',
    'progress-text': 'progress__text',
    
    // スコア/タイマー関連
    'score-display': 'game__score',
    'time-display': 'game__time',
    
    // ポップアップ関連
    'popup-overlay': 'popup',
    'retro-popup': 'popup__container',
    'popup-header': 'popup__header',
    'popup-title': 'popup__title',
    'popup-content': 'popup__content',
    'popup-close-btn': 'popup__close',
    
    // ローディング関連
    'loading-content': 'loading__content',
    'loading-logo': 'loading__logo',
    'loading-progress': 'loading__progress',
    'loading-bar': 'loading__bar',
    'loading-bar-fill': 'loading__bar-fill',
    'loading-text': 'loading__text',
    
    // アニメーション関連
    'pulse': 'anim--pulse',
    'blink': 'anim--blink'
};

/**
 * 既存の要素に新しいBEMクラスを自動的に適用する
 */
function applyBEMClasses() {
    console.log('BEMクラスの自動適用を開始します');
    
    // マッピングを反復処理
    Object.entries(bemClassMap).forEach(([oldClass, newClasses]) => {
        // 古いクラスを持つすべての要素を選択
        const elements = document.querySelectorAll('.' + oldClass);
        
        if (elements.length > 0) {
            console.log(`'${oldClass}' クラスを持つ要素を ${elements.length} 個見つけました`);
            
            // 各要素に新しいBEMクラスを追加
            elements.forEach(element => {
                // スペース区切りの複数クラスに対応
                newClasses.split(' ').forEach(newClass => {
                    if (!element.classList.contains(newClass)) {
                        element.classList.add(newClass);
                    }
                });
            });
        }
    });
    
    console.log('BEMクラスの自動適用が完了しました');
}

/**
 * クラス名（旧/新）で要素を選択するためのヘルパー関数
 * @param {string} oldClassName 古いクラス名
 * @returns {Element|null} 選択された要素
 */
function selectByClass(oldClassName) {
    // まず古いクラス名で検索
    let element = document.querySelector('.' + oldClassName);
    
    // 見つからなければ、対応するBEMクラスで検索
    if (!element && bemClassMap[oldClassName]) {
        const bemSelectors = bemClassMap[oldClassName].split(' ').map(c => '.' + c).join('');
        element = document.querySelector(bemSelectors);
    }
    
    return element;
}

/**
 * クラス名（旧/新）で要素を複数選択するためのヘルパー関数
 * @param {string} oldClassName 古いクラス名
 * @returns {NodeList} 選択された要素リスト
 */
function selectAllByClass(oldClassName) {
    // まず古いクラス名で検索
    const elements = document.querySelectorAll('.' + oldClassName);
    
    // 見つからなければ、対応するBEMクラスで検索
    if (elements.length === 0 && bemClassMap[oldClassName]) {
        const bemSelectors = bemClassMap[oldClassName].split(' ').map(c => '.' + c).join('');
        return document.querySelectorAll(bemSelectors);
    }
    
    return elements;
}

/**
 * 新しい要素を作成する際に、旧クラスとBEMクラスの両方を適用するヘルパー関数
 * @param {string} tagName 作成する要素のタグ名
 * @param {string} oldClassName 適用する古いクラス名
 * @param {string} [content=''] 要素内のテキストコンテンツ
 * @returns {Element} 作成された要素
 */
function createElementWithClasses(tagName, oldClassName, content = '') {
    const element = document.createElement(tagName);
    
    // 古いクラスを追加
    element.classList.add(oldClassName);
    
    // 対応するBEMクラスを追加
    if (bemClassMap[oldClassName]) {
        bemClassMap[oldClassName].split(' ').forEach(newClass => {
            element.classList.add(newClass);
        });
    }
    
    // コンテンツを設定
    if (content) {
        element.textContent = content;
    }
    
    return element;
}

// 新しいDOM操作ヘルパー関数を実装し、両方のクラスセレクタに対応する
// 既存のコードはそのままで動作し、新しいコードはこれらのヘルパー関数を使用できる

// DOMContentLoadedイベントリスナー
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM読み込み完了');
    
    // BEMクラスを自動適用
    applyBEMClasses();
    
    // 準備中のモードをマーク
    uiManager.markInProgressModes();
    
    // ローディングシミュレーション開始
    screenManager.simulateLoading();
});

// グローバルキーボードイベントハンドラ
document.addEventListener('keydown', (e) => {
  // ESCキー処理
  if (e.key === 'Escape') {
    e.preventDefault();
    
    // ポップアップが表示されている場合は閉じる
    if (popup.isVisible) {
      popup.hide();
      return;
    }
    
    // ポップアップが表示されていない場合のみゲーム画面でのESC処理を実行
    if (elements.screens.gameScreen.classList.contains('active')) {
      screenManager.backToMainMenu();
    }
  }
  
  // スペースキー処理（ポップアップが表示されていない場合のみ）
  if (e.key === ' ' && e.target === document.body && !popup.isVisible) {
    e.preventDefault();
    
    // リザルト画面の場合はゲーム画面に切り替えてからリセット
    if (elements.screens.resultScreen.classList.contains('active')) {
      audio.playButtonSound();
      screenManager.switchToScreen(elements.screens.gameScreen);
      screenManager.initGame();
      return;
    }
    
    // ゲーム画面の場合は通常のリセット
    if (elements.screens.gameScreen.classList.contains('active')) {
      screenManager.resetGame();
    }
  }
});

// 8ビット星エフェクトを初期化する関数
function initStarEffect() {
    const container = document.querySelector('.star-effect-container');
    if (!container) return;
    
    // コンテナをクリア
    container.innerHTML = '';
    
    // 星の数（パフォーマンスと視覚効果のバランス）
    const totalStars = 80;
    
    // 中央座標
    const centerX = 50; // パーセント
    const centerY = 50; // パーセント
    
    // 星の最大距離（中央からの）
    const maxDistance = 45; // 最大で中央から45%の距離まで
    
    // 星を生成して配置
    for (let i = 0; i < totalStars; i++) {
        // ランダムな角度 (0-360度)
        const angle = Math.random() * Math.PI * 2;
        
        // 距離を計算（中央に多く、外側に少なくなるよう分布）
        // Math.pow(Math.random(), 0.7)は中央と外側の密度バランスを調整
        const distance = Math.pow(Math.random(), 0.7) * maxDistance;
        
        // 位置を計算（中央からの相対位置）
        const x = centerX + Math.cos(angle) * distance;
        const y = centerY + Math.sin(angle) * distance;
        
        // 星要素を作成
        const star = document.createElement('div');
        star.className = 'star-pixel';
        star.style.left = `${x}%`;
        star.style.top = `${y}%`;
        
        // 回転を少しランダムに（より自然な見た目に）
        const rotation = Math.random() * 45; // 0-45度
        star.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
        
        // サイズをランダムに決定（small, normal, large）
        const sizeRand = Math.random();
        if (sizeRand < 0.3) {
            star.classList.add('small');
        } else if (sizeRand > 0.8) {
            star.classList.add('large');
        }
        
        // 中央からの距離を格納
        star.dataset.distance = distance.toFixed(2);
        
        // アニメーション遅延をランダムにして、すべての星が同時に動かないように
        star.style.animationDelay = `${Math.random() * 0.8}s`;
        
        container.appendChild(star);
    }
}

// 星エフェクトを更新する関数
function updateStarEffect(combo, rankText) {
    const container = document.querySelector('.star-effect-container');
    if (!container) return;
    
    // 星がなければ初期化
    if (container.children.length === 0) {
        initStarEffect();
    }
    
    // 全星を取得
    const stars = Array.from(container.querySelectorAll('.star-pixel'));
    
    // ミスまたはコンボなしの場合はリセット
    if (combo <= 0) {
        stars.forEach(star => {
            star.classList.remove('active', 'good', 'nice', 'great', 'awesome', 'excellent', 'unstoppable', 'legendary', 'godlike');
        });
        container.classList.remove('godlike');
        return;
    }
    
    // ランクに応じたクラス名
    let rankClass = '';
    if (combo <= 2) rankClass = 'good';
    else if (combo <= 4) rankClass = 'nice';
    else if (combo <= 6) rankClass = 'great';
    else if (combo <= 8) rankClass = 'awesome';
    else if (combo <= 10) rankClass = 'excellent';
    else if (combo <= 15) rankClass = 'unstoppable';
    else if (combo <= 20) rankClass = 'legendary';
    else rankClass = 'godlike';
    
    // コンボに基づいて表示する星の範囲を決定
    // コンボが大きいほど、広範囲の星が表示される
    const maxDistance = 45; // 星の最大配置距離
    const threshold = Math.min(maxDistance, combo * 2); // コンボに応じた表示範囲
    
    // 中央からの距離でソート
    stars.sort((a, b) => {
        return parseFloat(a.dataset.distance) - parseFloat(b.dataset.distance);
    });
    
    // RPGのレベルアップエフェクトのように、ランク変更時に特別な処理
    const prevRankText = elements.game.comboRank.dataset.prevRank || '';
    const rankChanged = prevRankText !== rankText;
    
    if (rankChanged && combo > 2) {
        // ランクが変わった時のエフェクト（すべての星が一度消えて、また現れる）
        stars.forEach(star => {
            star.classList.remove('active', 'good', 'nice', 'great', 'awesome', 'excellent', 'unstoppable', 'legendary', 'godlike');
            
            // 少し遅延させて再表示（レベルアップ感）
            setTimeout(() => {
                const distance = parseFloat(star.dataset.distance);
                if (distance <= threshold) {
                    star.classList.add('active', rankClass);
                    // 新しいアニメーションをトリガー
                    star.style.animation = 'none';
                    void star.offsetWidth; // 強制的に再フロー
                    star.style.animation = '';
                }
            }, 100);
        });
    } else {
        // 通常の更新
        stars.forEach(star => {
            // すべての星からクラスを一度削除
            star.className = 'star-pixel';
            if (star.classList.contains('small')) star.classList.add('small');
            if (star.classList.contains('large')) star.classList.add('large');
            
            // 距離が閾値以下なら表示
            const distance = parseFloat(star.dataset.distance);
            if (distance <= threshold) {
                star.classList.add('active', rankClass);
            }
        });
    }
    
    // 前回のランクを記録
    elements.game.comboRank.dataset.prevRank = rankText;
    
    // Godlike!状態の特別効果
    if (rankClass === 'godlike') {
        container.classList.add('godlike');
    } else {
        container.classList.remove('godlike');
    }
}

// 初期化後に星エフェクトを作成
document.addEventListener('DOMContentLoaded', function() {
    // 既存の初期化コード...
    
    // 星エフェクトを初期化
    initStarEffect();
});

// ピクセルウェーブエフェクトを初期化する関数
function initWaveEffect() {
    const waveGrid = document.querySelector('.wave-grid');
    if (!waveGrid) return;
    
    // グリッドをクリア
    waveGrid.innerHTML = '';
    
    // 波線の数（多いほど密集した波になる）
    const totalLines = 12;
    
    // 波線を生成
    for (let i = 0; i < totalLines; i++) {
        const waveLine = document.createElement('div');
        waveLine.className = 'wave-line';
        
        // 5種類の色を交互に使用
        const colorIndex = i % 5 + 1;
        waveLine.classList.add(`wave-line-${colorIndex}`);
        
        // 少しずつディレイをつけるためのデータ属性
        waveLine.dataset.index = i;
        
        waveGrid.appendChild(waveLine);
    }
    
    // 初期状態では非表示
    document.querySelector('.wave-overlay').classList.remove('visible');
}

// ウェーブエフェクトを更新する関数
function updateWaveEffect(combo, rankText) {
    const waveGrid = document.querySelector('.wave-grid');
    const waveOverlay = document.querySelector('.wave-overlay');
    if (!waveGrid || !waveOverlay) return;
    
    // 波線がなければ初期化
    if (waveGrid.children.length === 0) {
        initWaveEffect();
    }
    
    // 全波線を取得
    const waveLines = Array.from(waveGrid.querySelectorAll('.wave-line'));
    
    // ミスまたはコンボなしの場合はリセット
    if (combo <= 0) {
        waveGrid.className = 'wave-grid';
        waveLines.forEach(line => {
            line.classList.remove('active');
        });
        waveOverlay.classList.remove('visible');
        return;
    }
    
    // ランクに応じたクラス名
    let rankClass = '';
    if (combo <= 2) rankClass = 'good';
    else if (combo <= 4) rankClass = 'nice';
    else if (combo <= 6) rankClass = 'great';
    else if (combo <= 8) rankClass = 'awesome';
    else if (combo <= 10) rankClass = 'excellent';
    else if (combo <= 15) rankClass = 'unstoppable';
    else if (combo <= 20) rankClass = 'legendary';
    else rankClass = 'godlike';
    
    // ランク変更を検出
    const prevRankClass = waveGrid.className.replace('wave-grid ', '').trim();
    const rankChanged = prevRankClass !== rankClass;
    
    // ウェーブグリッドのクラスを更新
    waveGrid.className = 'wave-grid ' + rankClass;
    
    // コンボによって波の振幅を設定（カスタムプロパティ）
    const amplitude = Math.min(10, Math.floor(combo / 2));
    waveGrid.style.setProperty('--wave-amp', `${amplitude}px`);
    
    // 波線をアクティブにする（最初はすべて非アクティブ）
    if (combo > 0) {
        // コンボに応じて表示する線の数を増やす
        const visibleLines = Math.min(waveLines.length, Math.ceil(combo / 2));
        
        waveLines.forEach((line, index) => {
            // 表示する波線の数に基づいて表示/非表示
            if (index < visibleLines) {
                // 少しずつディレイをつけて順番に表示（下から上へ）
                setTimeout(() => {
                    line.classList.add('active');
                }, (waveLines.length - index) * 50);
            } else {
                line.classList.remove('active');
            }
        });
        
        // オーバーレイを表示
        waveOverlay.classList.add('visible');
    }
    
    // ランクが変わった時、特別なアニメーション（波のリセットと再表示）
    if (rankChanged && combo > 2) {
        // すべての波線をリセット
        waveLines.forEach(line => {
            line.classList.remove('active');
            
            // リセット後に再表示（80年代風の走査線エフェクト）
            setTimeout(() => {
                const delay = parseInt(line.dataset.index) * 80;
                setTimeout(() => {
                    line.classList.add('active');
                }, delay);
            }, 50);
        });
    }
}

// 初期化後にウェーブエフェクトを作成
document.addEventListener('DOMContentLoaded', function() {
    // 既存の初期化コード...
    
    // ウェーブエフェクトを初期化
    initWaveEffect();
});

// リザルト表示
function showResult(score, keystrokesCount, wpm) {
  // 結果画面の各要素を更新
  document.getElementById('final-score').textContent = score;
  document.getElementById('keystrokes').textContent = keystrokesCount;
  document.getElementById('wpm-value').textContent = wpm;
  
  // PERFECT CLEARの表示処理を無効化
  /*
  let clearStatusElement = document.querySelector('.result-score .clear-status');
  let resultScoreElement = document.querySelector('.result-score');
  
  // 全問正解だった場合のみPERFECT CLEARを表示
  if (missCount === 0 && questionCount > 0) {
    clearStatusElement.className = 'clear-status';
    clearStatusElement.textContent = 'PERFECT CLEAR!';
    clearStatusElement.style.display = 'block';
  } else {
    if (clearStatusElement) {
      clearStatusElement.style.display = 'none';
    }
  }
  
  // PERFECT CLEAR要素がなければ作成する
  if (!resultScoreElement.querySelector('.clear-status')) {
    clearStatusElement = document.createElement('div');
    clearStatusElement.className = 'clear-status';
    clearStatusElement.style.display = 'none';
    resultScoreElement.appendChild(clearStatusElement);
  }
  */
  
  // NEW RECORDの表示処理
  // ... existing code ...
}