import * as THREE from
'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

let renderer,scene,camera,clock;
let player,ball,opponent,goalkeeper;
let ballVelocity=new THREE.Vector3();
let keys={};
let running=false;
let animation;
let scoreA=0,scoreB=0;
let remaining=600;
let state='playing';
let aim=0,power=0;
let container,scoreElement,messageElement;
let facing=new THREE.Vector3(0,0,-1);
let lastTime=0;

const W=100,D=60;

function material(color){
 return new THREE.MeshStandardMaterial({color});
}

function box(w,h,d,color,x,y,z){
 const mesh=new THREE.Mesh(
  new THREE.BoxGeometry(w,h,d),material(color)
 );
 mesh.position.set(x,y,z);
 scene.add(mesh);
 return mesh;
}

function makePlayer(color,x,z){
 const group=new THREE.Group();
 const body=new THREE.Mesh(
  new THREE.CapsuleGeometry(1,2,4,8),
  material(color)
 );
 body.position.y=2;
 group.add(body);
 group.position.set(x,0,z);
 scene.add(group);
 return group;
}

function makeField(){
 const grass=box(W,0.2,D,0x258443,0,0,0);
 box(0.3,0.1,D,0xffffff,0,0.16,0);
 box(W,0.1,0.3,0xffffff,0,0.16,0);
 box(0.2,0.1,D,0xffffff,-W/2,0.16,0);
 box(0.2,0.1,D,0xffffff,W/2,0.16,0);

 box(W,0.1,0.2,0xffffff,0,0.16,-D/2);
 box(W,0.1,0.2,0xffffff,0,0.16,D/2);

 const circle=new THREE.Mesh(
  new THREE.RingGeometry(9.8,10,64),
  new THREE.MeshBasicMaterial({
   color:0xffffff,side:THREE.DoubleSide
  })
 );
 circle.rotation.x=-Math.PI/2;
 circle.position.y=0.17;
 scene.add(circle);

 box(0.2,0.1,D,0xffffff,0,0.17,0);

 // Áreas
 for(const z of [-25,25]){
  box(32,0.1,0.2,0xffffff,0,0.17,z);
  box(0.2,0.1,15,0xffffff,-16,0.17,z+(z<0?7.5:-7.5));
  box(0.2,0.1,15,0xffffff,16,0.17,z+(z<0?7.5:-7.5));
 }
 // Porterías
 for(const z of [-31,31]){
  box(0.3,5,0.3,0xffffff,-7,2.5,z);
  box(0.3,5,0.3,0xffffff,7,2.5,z);
  box(14,0.3,0.3,0xffffff,0,5,z);
 }
}

function makeBall(){
 const b=new THREE.Mesh(
  new THREE.SphereGeometry(0.8,24,24),
  material(0xffffff)
 );
 b.position.set(0,0.8,0);
 scene.add(b);
 return b;
}

function message(text){
 messageElement.textContent=text;
 clearTimeout(message.timer);
 message.timer=setTimeout(()=>{
  if(state==='playing')messageElement.textContent='';
 },1800);
}

function resetBall(){
 ball.position.set(0,0.8,0);
 ballVelocity.set(0,0,0);
 player.position.set(0,0,18);
 opponent.position.set(0,0,-18);
 state='playing';
}

function restartAfterGoal(){
 setTimeout(resetBall,1200);
}

function shoot(pass=false){
 if(state!=='playing')return;
 if(player.position.distanceTo(ball.position)>5)return;

 const direction=facing.clone();
 direction.y=pass?0.12:0.3;
 direction.normalize();
 const speed=pass?19:34;
 ballVelocity.copy(direction.multiplyScalar(speed));
}

function throwIn(){
 state='throwin';
 ballVelocity.set(0,0,0);
 const side=ball.position.x>0?1:-1;
 player.position.set(side*47,0,ball.position.z);
 ball.position.set(side*49,2,ball.position.z);
 aim=side>0?Math.PI:0;
 power=0;
 message('SAQUE DE BANDA: A/D APUNTAR');
}

function takeThrow(){
 if(state!=='throwin')return;
 const side=player.position.x>0?1:-1;
 const direction=new THREE.Vector3(
  -side*Math.cos(aim),0.65,
  Math.sin(aim)
 ).normalize();
 ballVelocity.copy(direction.multiplyScalar(15+power*22));
 ball.position.copy(player.position);
 ball.position.y=3;
 state='playing';
 message('¡SAQUE REALIZADO!');
}

function updatePlayer(dt){
 if(state!=='playing')return;
 const direction=new THREE.Vector3();

 if(keys.KeyW)direction.z-=1;
 if(keys.KeyS)direction.z+=1;
 if(keys.KeyA)direction.x-=1;
 if(keys.KeyD)direction.x+=1;

 if(direction.length()>0){
  direction.normalize();
  facing.copy(direction);
  const speed=keys.ShiftLeft?19:12;
  player.position.addScaledVector(direction,speed*dt);
  player.position.x=THREE.MathUtils.clamp(
   player.position.x,-48,48);
  player.position.z=THREE.MathUtils.clamp(
   player.position.z,-28,28);
 }
}

function updateBall(dt){
 ballVelocity.y-=24*dt;
 ball.position.addScaledVector(ballVelocity,dt);

 if(ball.position.y<0.8){
  ball.position.y=0.8;
  ballVelocity.y=Math.abs(ballVelocity.y)*0.55;
  if(Math.abs(ballVelocity.y)<1)ballVelocity.y=0;
 }

 ballVelocity.multiplyScalar(Math.pow(0.985,dt*60));

 if(state==='playing'){
  if(Math.abs(ball.position.x)>50){
   throwIn();
   return;
  }

  if(Math.abs(ball.position.z)>30){
   if(Math.abs(ball.position.x)<7 &&
      ball.position.z>30){
    scoreA++;
    message('¡¡¡GOOOOOOL!!!');
    updateScore();
    restartAfterGoal();
    return;
   }
   if(Math.abs(ball.position.x)<7 &&
      ball.position.z< -30){
    scoreB++;
    message('¡GOL DEL RIVAL!');
    updateScore();
    restartAfterGoal();
    return;
   }

   state='restart';
   message(Math.abs(ball.position.x)>7?
    'SAQUE DE ESQUINA / PUERTA':
    'SAQUE DE PUERTA');
   setTimeout(resetBall,1500);
   return;
  }
 }

 if(state==='playing' && player.position.distanceTo(ball.position)<2.2){
  // El jugador puede controlar el balón al acercarse
  if(ball.position.y<2){
   ballVelocity.x*=0.94;
   ballVelocity.z*=0.94;
  }
 }
}

function updateOpponent(dt){
 if(state!=='playing')return;
 const target=ball.position;
 const direction=new THREE.Vector3(
  target.x-opponent.position.x,0,
  target.z-opponent.position.z
 );
 if(direction.length()>1){
  direction.normalize();
  opponent.position.addScaledVector(direction,5*dt);
 }
 opponent.position.x=THREE.MathUtils.clamp(opponent.position.x,-47,47);
 opponent.position.z=THREE.MathUtils.clamp(opponent.position.z,-28,28);

 if(opponent.position.distanceTo(ball.position)<2.5 &&
    ball.position.y<3){
  ballVelocity.z+=8*dt;
 }
}

function updateScore(){
 const minutes=Math.floor(remaining/60);
 const seconds=remaining%60;
 scoreElement.textContent=
 `${scoreA} - ${scoreB} | ${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
}

function onDown(e){
 keys[e.code]=true;
 if(e.code==='Space'){
  e.preventDefault();
  if(state==='throwin'){
   power=Math.min(1,power+0.15);
  }else shoot(false);
 }
 if(e.code==='KeyE')shoot(true);
 if(state==='throwin'){
  if(e.code==='KeyA')aim-=0.12;
  if(e.code==='KeyD')aim+=0.12;
 }
}

function onUp(e){
 keys[e.code]=false;
 if(e.code==='Space' && state==='throwin')takeThrow();
}

function animate(){
 if(!running)return;
 animation=requestAnimationFrame(animate);
 const dt=Math.min(clock.getDelta(),0.04);

 if(state==='playing'){
  remaining-=dt;
  if(remaining<=0){
   remaining=0;
   state='finished';
   message('¡FINAL DEL PARTIDO!');
  }
 }
 updatePlayer(dt);
 updateBall(dt);
 updateOpponent(dt);

 if(state==='throwin'){
  ball.position.x=player.position.x+
   (player.position.x>0?2:-2);
  ball.position.z=player.position.z;
  ball.position.y=2.5;
 }

 camera.position.x=player.position.x*0.3;
 camera.position.z=player.position.z+35;
 camera.lookAt(player.position.x,0,player.position.z-5);

 updateScore();
 renderer.render(scene,camera);
}

export function startFootball(options){
 container=options.container;
 scoreElement=document.getElementById('score');
 messageElement=document.getElementById('message');
 remaining=options.duration;
 scoreA=0;
 scoreB=0;
 state='playing';
 keys={};

 scene=new THREE.Scene();
 scene.background=new THREE.Color(0x87b9e8);
 scene.fog=new THREE.Fog(0x87b9e8,100,220);

 camera=new THREE.PerspectiveCamera(
  60,container.clientWidth/container.clientHeight,0.1,500
 );
 camera.position.set(0,35,55);

 renderer=new THREE.WebGLRenderer({antialias:true});
 renderer.setSize(container.clientWidth,container.clientHeight);
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));
 container.appendChild(renderer.domElement);

 scene.add(new THREE.HemisphereLight(0xffffff,0x456b39,2));
 const sun=new THREE.DirectionalLight(0xffffff,2);
 sun.position.set(20,50,20);
 scene.add(sun);

 makeField();
 player=makePlayer(0x174bd1,0,18);
 opponent=makePlayer(0xe32636,0,-18);
 goalkeeper=makePlayer(0xffdd00,0,-27);
 ball=makeBall();

 // Gradas sencillas
 box(120,8,8,0x253650,0,4,-38);
 box(120,8,8,0x253650,0,4,38);

 clock=new THREE.Clock();
 running=true;
 updateScore();

 window.addEventListener('keydown',onDown);
 window.addEventListener('keyup',onUp);

 animate();
}

export function dispose(){
 running=false;
 cancelAnimationFrame(animation);
 window.removeEventListener('keydown',onDown);
 window.removeEventListener('keyup',onUp);
 if(renderer){
  renderer.dispose();
  renderer.domElement.remove();
 }
}
