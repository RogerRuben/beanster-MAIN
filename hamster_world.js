/* Read-only mirror of HamsterDirector. Motion requests go to the director. */
const HamsterWorld={
  auto:true,mode:'seated',x:390,y:800,scale:0.50,sprite:'hamster_idle_base',
  trace:[],samples:[],greeting:false,cleanupReturn:false,
  atSeat(){return window.HamsterDirector?HamsterDirector.atSeat():this.mode==='seated'},
  inFront(){return this.y>=(window.BEANSTER_ASSETS?.scene?.roam?.tableFrontY||856)},
  allowsAmbient(){return this.atSeat()},
  boot(){window.HamsterDirector?.boot()},
  returnForCleanup(done){window.HamsterDirector?.requestCleanup([],done)},
  greet(){window.HamsterDirector?.floorWave()},
  onStrong(){window.HamsterDirector?.pause()},
  clearSchedule(){},
  ensure(){},
  schedule(){}
};
window.HamsterWorld=HamsterWorld;
