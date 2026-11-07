
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>FC Barça 3D Career 2.0</title>
<style>
body{margin:0;background:#07152c;color:white;text-align:center;font-family:Arial}
h1{color:#f4c542}
#score{font-size:26px;padding:10px}
#game{width:100%;max-width:1000px;margin:auto}
canvas{width:100%;height:auto;display:block}
p{color:#ddd}
</style>
</head>
<body>
<h1>🔵🔴 FC BARÇA 3D CAREER</h1>
<div id="score">BARÇA 0 - 0 ATLÉTICO | 00:00</div>
<div id="game"></div>
<p>WASD: moverte | SHIFT: correr | ESPACIO: chutar | X: pasar | Q: cambiar jugador</p>
<p id="message">¡Empieza el partido!</p>

<script type="module">
import * as THREE from
'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x82b9e8);

const camera=new THREE.PerspectiveCamera(60,1,0.1,200);
camera.position.set(0,19,24);

const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
document.getElementById('game').appendChild(renderer.domElement);

function resize(){
 const w=Math.min(innerWidth,1000);
 const h=w*0.58;
 renderer.setSize(w,h);
 camera.aspect=w/h;
 camera.updateProjectionMatrix();
}
addEventListener('resize',resize);resize();

scene.add(new THREE.HemisphereLight(0xffffff,0x456b35,2));
const sun=new THREE.DirectionalLight(0xffffff,2);
sun.position.set(8,20,10);scene.add(sun);

const grass=new THREE.Mesh(
 new THREE.PlaneGeometry(28,44),
 new THREE.MeshStandardMaterial({color:0x238b36})
);
grass.rotation.x=-Math.PI/2;scene.add(grass);

function marking(x,z,w,h){
 const m=new THREE.Mesh(
  new THREE.BoxGeometry(w,.04,h),
  new THREE.MeshBasicMaterial({color:0xffffff})
 );
 m.position.set(x,.04,z);scene.add(m);
}
marking(0,0,28,.12);
marking(0,-22,28,.12);
marking(0,22,28,.12);
marking(-14,0,.12,44);
marking(14,0,.12,44);

const circle=new THREE.Mesh(
 new THREE.RingGeometry(4.8,4.95,64),
 new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide})
);
circle.rotation.x=-Math.PI/2;circle.position.y=.05;scene.add(circle);

function goal(z){
 const mat=new THREE.MeshStandardMaterial({color:0xffffff});
 function post(x,y,zz,w,h,d){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
  m.position.set(x,y,zz);scene.add(m);
 }
 post(-3,1,z,.13,2,.13);
 post(3,1,z,.13,2,.13);
 post(0,2,z,6,.13,.13);
 for(let i=-3;i<=3;i+=.5){
  const net=new THREE.Mesh(
   new THREE.BoxGeometry(.025,2,.025),
   new THREE.MeshBasicMaterial({color:0xdddddd})
  );
  net.position.set(i,1,z+(z<0?1:-1));scene.add(net);
 }
}
goal(-21.7);goal(21.7);

// Gradas y asientos
for(let row=0;row<4;row++){
 for(let i=0;i<48;i++){
  const a=i/48*Math.PI*2;
  const seat=new THREE.Mesh(
   new THREE.BoxGeometry(.45,.35,.45),
   new THREE.MeshStandardMaterial({
    color:i%3===0?0x163caa:0xeeeeee
   })
  );
  seat.position.set(Math.cos(a)*(17+row),
   1+row*.7,Math.sin(a)*(25+row));
  seat.lookAt(0,1,0);scene.add(seat);
 }
}

function makePlayer(x,z,color){
 const g=new THREE.Group();
 const shirt=new THREE.Mesh(
  new THREE.CylinderGeometry(.38,.43,.9,12),
  new THREE.MeshStandardMaterial({color})
 );
 shirt.position.y=1.05;g.add(shirt);
 const head=new THREE.Mesh(
  new THREE.SphereGeometry(.25,16,16),
  new THREE.MeshStandardMaterial({color:0xe8b58e})
 );
 head.position.y=1.72;g.add(head);
 for(const side of [-1,1]){
  const leg=new THREE.Mesh(
   new THREE.CylinderGeometry(.11,.12,.65,10),
   new THREE.MeshStandardMaterial({color:0x222222})
  );
  leg.position.set(side*.17,.35,0);g.add(leg);
 }
 g.position.set(x,0,z);scene.add(g);
 return g;
}

const blue=0x1745bd, red=0xb51e2d;
const home=[],away=[];

const formation=[
 [-10,13],[-4,14],[4,14],[10,13],
 [-7,7],[0,8],[7,7],
 [-9,1],[0,0],[9,1],[0,5]
];
formation.forEach(([x,z])=>home.push(makePlayer(x,z,blue)));

const opponents=[
 [-10,-13],[-4,-14],[4,-14],[10,-13],
 [-7,-7],[0,-8],[7,-7],
 [-9,-1],[0,-2],[9,-1],[0,-18]
];
opponents.forEach(([x,z])=>away.push(makePlayer(x,z,red)));

let selected=9;
const ball=new THREE.Mesh(
 new THREE.SphereGeometry(.35,24,24),
 new THREE.MeshStandardMaterial({color:0xffffff})
);
ball.position.set(0,.35,0);scene.add(ball);

let velocity=new THREE.Vector3();
let scoreHome=0,scoreAway=0,seconds=0;
let keys={};
let lastShot=0;
const message=document.getElementById('message');

addEventListener('keydown',e=>{
 keys[e.code]=true;
 if(e.code==='KeyQ')selected=(selected+1)%home.length;
});
addEventListener('keyup',e=>keys[e.code]=false);

function resetBall(){
 ball.position.set(0,.35,0);
 velocity.set(0,0,0);
 home.forEach((p,i)=>{
  p.position.set(formation[i][0],0,formation[i][1]);
 });
 away.forEach((p,i)=>{
  p.position.set(opponents[i][0],0,opponents[i][1]);
 });
}

function animate(){
 requestAnimationFrame(animate);
 const dt=1/60;
 seconds+=dt;
 const player=home[selected];
 const speed=keys.ShiftLeft?.19:.11;

 if(keys.KeyW)player.position.z-=speed;
 if(keys.KeyS)player.position.z+=speed;
 if(keys.KeyA)player.position.x-=speed;
 if(keys.KeyD)player.position.x+=speed;

 player.position.x=THREE.MathUtils.clamp(player.position.x,-13,13);
 player.position.z=THREE.MathUtils.clamp(player.position.z,-20,20);

 // Acercar el balón al jugador
 const distance=player.position.distanceTo(ball.position);
 if(distance<1.4){
  if(keys.Space&&performance.now()-lastShot>500){
   velocity.set(0,0,-.55);
   lastShot=performance.now();
   message.textContent='¡CHUTASTE A PORTERÍA!';
  }
  if(keys.KeyX){
   const mate=home.find((p,i)=>i!==selected);
   if(mate){
    velocity.set(
     (mate.position.x-ball.position.x)*.12,
     .06,
     (mate.position.z-ball.position.z)*.12
    );
    message.textContent='¡PASE!';
   }
  }
  if(!keys.Space&&!keys.KeyX){
   ball.position.x+=(player.position.x-ball.position.x)*.15;
   ball.position.z+=(player.position.z-ball.position.z)*.15;
  }
 }

 // Rivales persiguen el balón
 away.slice(0,10).forEach(p=>{
  const dx=ball.position.x-p.position.x;
  const dz=ball.position.z-p.position.z;
  const d=Math.hypot(dx,dz);
  if(d>1.2){
   p.position.x+=dx/d*.045;
   p.position.z+=dz/d*.045;
  }
 });

 // Movimiento del balón
 ball.position.add(velocity);
 velocity.multiplyScalar(.985);
 if(ball.position.y>.35){
  velocity.y-=.012;
 }else{
  ball.position.y=.35;
  velocity.y=Math.abs(velocity.y)*.45;
 }
 if(Math.abs(ball.position.x)>13)velocity.x*=-.7;
 if(Math.abs(ball.position.z)>21){
  if(Math.abs(ball.position.x)<3){
   if(ball.position.z<0)scoreHome++;
   else scoreAway++;
   message.textContent='¡¡¡GOOOOOOL!!!';
   resetBall();
  }else velocity.z*=-.7;
 }

 ball.position.x=THREE.MathUtils.clamp(ball.position.x,-13.5,13.5);
 ball.position.z=THREE.MathUtils.clamp(ball.position.z,-22,22);

 camera.position.x+=(player.position.x-camera.position.x)*.035;
 camera.position.z+=(player.position.z+17-camera.position.z)*.035;
 camera.lookAt(player.position.x,0,player.position.z-3);

 document.getElementById('score').textContent=
 `BARÇA ${scoreHome} - ${scoreAway} ATLÉTICO | ${
 String(Math.floor(seconds/60)).padStart(2,'0')
 }:${String(Math.floor(seconds%60)).padStart(2,'0')}`;

 renderer.render(scene,camera);
