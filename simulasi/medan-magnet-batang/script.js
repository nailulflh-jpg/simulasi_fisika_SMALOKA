const canvas = document.getElementById('magnetCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 600;
canvas.height = 400;

// Ambil elemen UI
const magnet1AngleInput = document.getElementById('magnet1Angle');
const magnet1AngleValueSpan = document.getElementById('magnet1AngleValue');
const magnet2AngleInput = document.getElementById('magnet2Angle');
const magnet2AngleValueSpan = document.getElementById('magnet2AngleValue');
const toggleMagnet1Input = document.getElementById('toggleMagnet1');
const toggleMagnet2Input = document.getElementById('toggleMagnet2');
const resetButton = document.getElementById('resetButton');

// Konstanta
const LINES_PER_MAGNET = 25; // Jumlah garis per kutub magnet
const MAX_STEPS = 2000;      // Batas langkah
const STEP_SIZE = 1.5;       // Ukuran langkah untuk kehalusan garis
const MAGNET_LENGTH = 120;
const MAGNET_WIDTH = 30;
const POLE_STRENGTH = 100;

// Objek magnet batang
let magnets = [
    { id: 1, x: canvas.width * 0.25, y: canvas.height / 2, angle: 0, isDragging: false, color: 'red', isVisible: true },
    { id: 2, x: canvas.width * 0.75, y: canvas.height / 2, angle: 0, isDragging: false, color: 'green', isVisible: true }
];

// Fungsi untuk menggambar magnet batang
function drawMagnets() {
    magnets.forEach(magnet => {
        if (!magnet.isVisible) return;

        ctx.save();
        ctx.translate(magnet.x, magnet.y);
        ctx.rotate(magnet.angle * Math.PI / 180);

        // Kutub Utara (N)
        ctx.fillStyle = magnet.color;
        ctx.fillRect(-MAGNET_LENGTH / 2, -MAGNET_WIDTH / 2, MAGNET_LENGTH / 2, MAGNET_WIDTH);
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`N`, -MAGNET_LENGTH / 4, 0);

        // Kutub Selatan (S)
        ctx.fillStyle = 'blue';
        ctx.fillRect(0, -MAGNET_WIDTH / 2, MAGNET_LENGTH / 2, MAGNET_WIDTH);
        ctx.fillStyle = 'white';
        ctx.fillText(`S`, MAGNET_LENGTH / 4, 0);

        ctx.restore();
    });
}

// Fungsi untuk menggambar panah
function drawArrowhead(x, y, angle, size = 8) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size, -size / 2);
    ctx.lineTo(-size, size / 2);
    ctx.closePath();
    ctx.fillStyle = '#333';
    ctx.fill();
    ctx.restore();
}

// Fungsi untuk menghitung vektor medan magnet di titik (px, py)
function getMagneticField(px, py) {
    let Bx = 0;
    let By = 0;

    magnets.forEach(magnet => {
        if (!magnet.isVisible) return;

        const angleRad = magnet.angle * Math.PI / 180;
        const halfLength = MAGNET_LENGTH / 2;
        
        const nx = magnet.x - halfLength * Math.cos(angleRad);
        const ny = magnet.y - halfLength * Math.sin(angleRad);
        const sx = magnet.x + halfLength * Math.cos(angleRad);
        const sy = magnet.y + halfLength * Math.sin(angleRad);

        // Medan dari kutub Utara (tolak)
        const dxN = px - nx;
        const dyN = py - ny;
        const distN2 = dxN * dxN + dyN * dyN;
        const distN = Math.sqrt(distN2);
        if (distN > 1) {
            const scale = POLE_STRENGTH / distN2;
            Bx += scale * (dxN / distN);
            By += scale * (dyN / distN);
        }

        // Medan dari kutub Selatan (tarik)
        const dxS = px - sx;
        const dyS = py - sy;
        const distS2 = dxS * dxS + dyS * dyS;
        const distS = Math.sqrt(distS2);
        if (distS > 1) {
            const scale = -POLE_STRENGTH / distS2;
            Bx += scale * (dxS / distS);
            By += scale * (dyS / distS);
        }
    });
    
    return { Bx, By };
}

// Fungsi untuk menggambar garis-garis medan magnet
function drawFieldLines() {
    magnets.forEach(magnet => {
        if (!magnet.isVisible) return;

        const angleRad = magnet.angle * Math.PI / 180;
        const halfLength = MAGNET_LENGTH / 2;
        
        // Posisi aktual kutub Utara magnet ini
        const nx = magnet.x - halfLength * Math.cos(angleRad);
        const ny = magnet.y - halfLength * Math.sin(angleRad);
        
        // Posisi aktual kutub Selatan magnet ini
        const sx = magnet.x + halfLength * Math.cos(angleRad);
        const sy = magnet.y + halfLength * Math.sin(angleRad);

        // Garis dari kutub Utara (keluar)
        for (let i = 0; i < LINES_PER_MAGNET; i++) {
            const startAngle = (i / LINES_PER_MAGNET) * 2 * Math.PI;
            let x = nx + Math.cos(startAngle) * 5;
            let y = ny + Math.sin(startAngle) * 5;
            
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            
            const path = [];
            path.push({x, y});

            for (let step = 0; step < MAX_STEPS; step++) {
                const B_vec = getMagneticField(x, y);
                const B_magnitude = Math.sqrt(B_vec.Bx * B_vec.Bx + B_vec.By * B_vec.By);

                if (B_magnitude < 0.001) break;
                
                const nextX = x + (B_vec.Bx / B_magnitude) * STEP_SIZE;
                const nextY = y + (B_vec.By / B_magnitude) * STEP_SIZE;

                if (nextX < 0 || nextX > canvas.width || nextY < 0 || nextY > canvas.height) {
                    break;
                }

                ctx.lineTo(nextX, nextY);
                x = nextX;
                y = nextY;
                path.push({x, y});
            }
            ctx.stroke();

            if (path.length > 50) {
                const midIndex = Math.floor(path.length / 2);
                const pos = path[midIndex];
                const prevPos = path[midIndex - 1];
                const angle = Math.atan2(pos.y - prevPos.y, pos.x - prevPos.x);
                drawArrowhead(pos.x, pos.y, angle);
            }
        }

        // Garis dari kutub Selatan (masuk)
        for (let i = 0; i < LINES_PER_MAGNET; i++) {
            const startAngle = (i / LINES_PER_MAGNET) * 2 * Math.PI;
            let x = sx + Math.cos(startAngle) * 5;
            let y = sy + Math.sin(startAngle) * 5;
            
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            
            const path = [];
            path.push({x, y});

            for (let step = 0; step < MAX_STEPS; step++) {
                const B_vec = getMagneticField(x, y);
                const B_magnitude = Math.sqrt(B_vec.Bx * B_vec.Bx + B_vec.By * B_vec.By);

                if (B_magnitude < 0.001) break;
                
                // Tracing backwards (masuk)
                const nextX = x - (B_vec.Bx / B_magnitude) * STEP_SIZE;
                const nextY = y - (B_vec.By / B_magnitude) * STEP_SIZE;

                if (nextX < 0 || nextX > canvas.width || nextY < 0 || nextY > canvas.height) {
                    break;
                }

                ctx.lineTo(nextX, nextY);
                x = nextX;
                y = nextY;
                path.push({x, y});
            }
            ctx.stroke();

            if (path.length > 50) {
                const midIndex = Math.floor(path.length / 2);
                const pos = path[midIndex];
                const prevPos = path[midIndex - 1];
                const angle = Math.atan2(prevPos.y - pos.y, prevPos.x - pos.x);
                drawArrowhead(pos.x, pos.y, angle);
            }
        }
    });
}

// Fungsi render utama
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawMagnets();
    drawFieldLines();
}

// Event Listeners
magnet1AngleInput.addEventListener('input', () => {
    magnets[0].angle = parseInt(magnet1AngleInput.value);
    magnet1AngleValueSpan.textContent = `${magnets[0].angle}°`;
    render();
});

magnet2AngleInput.addEventListener('input', () => {
    magnets[1].angle = parseInt(magnet2AngleInput.value);
    magnet2AngleValueSpan.textContent = `${magnets[1].angle}°`;
    render();
});

toggleMagnet1Input.addEventListener('change', () => {
    magnets[0].isVisible = toggleMagnet1Input.checked;
    render();
});

toggleMagnet2Input.addEventListener('change', () => {
    magnets[1].isVisible = toggleMagnet2Input.checked;
    render();
});

resetButton.addEventListener('click', () => {
    magnets[0].x = canvas.width * 0.25;
    magnets[0].y = canvas.height / 2;
    magnets[0].angle = 0;
    magnets[0].isVisible = true;
    magnets[1].x = canvas.width * 0.75;
    magnets[1].y = canvas.height / 2;
    magnets[1].angle = 0;
    magnets[1].isVisible = true;
    magnet1AngleInput.value = 0;
    magnet2AngleInput.value = 0;
    toggleMagnet1Input.checked = true;
    toggleMagnet2Input.checked = true;
    magnet1AngleValueSpan.textContent = `0°`;
    magnet2AngleValueSpan.textContent = `0°`;
    render();
});

// Drag and drop magnet
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    magnets.forEach(magnet => {
        const dx = mouseX - magnet.x;
        const dy = mouseY - magnet.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MAGNET_LENGTH / 2 + 10) { 
            magnet.isDragging = true;
            canvas.style.cursor = 'grabbing';
        }
    });
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    magnets.forEach(magnet => {
        if (magnet.isDragging) {
            magnet.x = mouseX;
            magnet.y = mouseY;
            render();
        }
    });
});

canvas.addEventListener('mouseup', () => {
    magnets.forEach(magnet => {
        magnet.isDragging = false;
    });
    canvas.style.cursor = 'grab';
});

// Jalankan simulasi untuk pertama kali
render();