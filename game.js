const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 750,
    parent: 'game-container',
    backgroundColor: '#34495e',
    render: { antialias: false, roundPixels: true },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { debug: false } },
    scene: { preload: preload, create: create, update: update }
};

let game = new Phaser.Game(config);
let points = 520;
let pointText, allWords, currentQuestion, wordText;
let buttons = [];
let monsters, towers, bullets;
const TILE_SIZE = 50;

// 1은 길, 0은 타워 설치 가능 구역 (10x16 그리드)
const mapData = [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
];

function preload() {
    this.load.json('wordData', 'words.json');
}

function create() {
    allWords = this.cache.json.get('wordData');
    monsters = this.physics.add.group();
    towers = this.add.group();
    bullets = this.physics.add.group();

    drawMap(this);
    setupQuiz(this);

    // 3초마다 몬스터 생성
    this.time.addEvent({ delay: 3000, callback: spawnMonster, callbackScope: this, loop: true });

    // 총알과 몬스터 충돌 설정
    this.physics.add.overlap(bullets, monsters, (bullet, monster) => {
        bullet.destroy();
        monster.hp -= 50; // 총알 데미지
        if (monster.hp <= 0) monster.destroy();
    });
}

function drawMap(scene) {
    const startY = 250;
    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 16; c++) {
            let x = c * TILE_SIZE + 25;
            let y = startY + r * TILE_SIZE + 25;
            let isPath = mapData[r][c] === 1;
            let tile = scene.add.rectangle(x, y, 48, 48, isPath ? 0xbdc3c7 : 0x27ae60).setOrigin(0.5);
            if (!isPath) {
                tile.setInteractive().on('pointerdown', () => {
                    if (points >= 100) placeTower(scene, x, y);
                });
            }
        }
    }
}

function placeTower(scene, x, y) {
    points -= 100;
    pointText.setText('Point: ' + points);
    let tower = scene.add.rectangle(x, y, 40, 40, 0x2c3e50).setStrokeStyle(2, 0xffffff);
    tower.lastFired = 0;
    towers.add(tower);
}

function spawnMonster() {
    // 몬스터 이동 경로 (mapData의 1번 길을 따라감)
    const path = new Phaser.Curves.Path(0, 325);
    path.lineTo(225, 325).lineTo(225, 425).lineTo(425, 425).lineTo(425, 525).lineTo(800, 525);
    
    let monster = this.add.follower(path, 0, 325, 20, 0xe74c3c);
    this.physics.add.existing(monster);
    monster.hp = 100;
    monster.startFollow({ duration: 10000, onComplete: () => monster.destroy() });
    monsters.add(monster);
}

function update(time) {
    // 타워 공격 감지 루프
    towers.getChildren().forEach(tower => {
        if (time > tower.lastFired) {
            let target = monsters.getChildren().find(m => 
                Phaser.Math.Distance.Between(tower.x, tower.y, m.x, m.y) < 150
            );
            if (target) {
                let bullet = this.add.circle(tower.x, tower.y, 5, 0xf1c40f);
                this.physics.add.existing(bullet);
                this.physics.moveToObject(bullet, target, 400); // 총알 속도
                bullets.add(bullet);
                tower.lastFired = time + 800; // 발사 간격 (0.8초)
            }
        }
    });
}

function setupQuiz(scene) {
    scene.add.rectangle(400, 100, 800, 200, 0xffe4c4);
    pointText = scene.add.text(20, 215, 'Point: ' + points, { fontSize: '20px', fill: '#fff', fontWeight: 'bold' });
    wordText = scene.add.text(200, 100, '', { fontSize: '36px', fill: '#000', fontWeight: 'bold' }).setOrigin(0.5);
    showNewQuestion(scene);
}

function showNewQuestion(scene) {
    let current = Phaser.Math.RND.pick(allWords);
    wordText.setText(current.word);
    buttons.forEach(b => b.destroy());
    buttons = [];
    let opts = [current, ...allWords.filter(w => w !== current).sort(() => 0.5 - Math.random()).slice(0, 3)].sort(() => 0.5 - Math.random());
    opts.forEach((opt, i) => {
        let x = 550 + (i % 2) * 120, y = 70 + Math.floor(i / 2) * 60;
        let btn = scene.add.rectangle(x, y, 110, 50, 0xe74c3c).setInteractive({ useHandCursor: true }).setStrokeStyle(1, 0x000000);
        let txt = scene.add.text(x, y, opt.meaning, { fontSize: '14px', fill: '#fff', fontWeight: 'bold', wordWrap: { width: 100 } }).setOrigin(0.5);
        btn.on('pointerdown', () => {
            if (opt === current) { points += 100; pointText.setText('Point: ' + points); showNewQuestion(scene); }
            else { scene.cameras.main.shake(100, 0.005); }
        });
        buttons.push(btn, txt);
    });
}