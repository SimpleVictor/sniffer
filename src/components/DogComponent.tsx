import * as React from 'react';
import { Component } from 'react';
import { TweenMax } from 'gsap';

class DogComponent extends Component {
  constructor(public props: any) {
    super(props);
  }

  componentDidMount() {
    ActivateDogAnimation();
  }

  render() {
    return (
      <div className='dog-container'>
        <svg xmlns='http://www.w3.org/2000/svg' viewBox='-250 175 1100 240'>
          <title>doghead</title>
          <defs>

            <clipPath id='mainMask'>
              <rect id='bg' width='600' height='600' rx='56' ry='56' fill='#C32747'/>

            </clipPath>
          </defs>
          <use/>
          <g id='dogGroup'>
            <rect id='earL' x='207' y='220' width='31' height='187' rx='15' ry='15' fill='#363C51'/>
            <rect id='earR' x='361' y='220.94' width='31' height='187' rx='15.7' ry='15.7' fill='#363C51'/>
            <ellipse id='head' cx='301' cy='285' rx='86' ry='94' fill='#1A99F3'/>
            <rect id='earLTOP' x='207' y='220' width='31' height='187' rx='15' ry='15' fill='#292E40'/>
            <rect id='earRTOP' x='361' y='220.94' width='31' height='187' rx='15.7' ry='15.7' fill='#292E40'/>
            <rect id='snout' x='239' y='294' width='121' height='84.98' rx='42' ry='42' fill='#FFF'/>
            <g id='logo-nose' >
              <rect x='276' y='325' width='46' height='23' rx='11' ry='11' fill='#292E40'/>
              <path id='noseShine' fill='none' stroke='#AAABAF' strokeWidth='4' strokeLinecap='round' d='M282.1,337.7L282.1,337.7c0-4.2,3.4-7.6,7.6-7.6h20.4c4.2,0,7.6,3.4,7.6,7.6l0,0'/>
            </g>
            <rect id='noseShine' x='306' y='331' width='6' height='6' rx='3' ry='3' fill='#ededed'/>
            <g id='browGroup' stroke='#292E40' strokeLinecap='round' >
              <line id='browL' x1='250' y1='253' x2='290' y2='253' fill='none'  strokeMiterlimit='10' strokeWidth='7'/>
              <line id='browR' x1='309' y1='253' x2='349' y2='253' fill='none' strokeMiterlimit='10' strokeWidth='7'/>
            </g>
            <g id='eyeGroup' fill='#292E40'>
              <g id='eyeSpinL'>
                <ellipse id='eyeL' className='eye' cx='270' cy='285' rx='7' ry='7' />
              </g>
              <g id='eyeSpinR'>
                <ellipse id='eyeR' className='eye' cx='329' cy='285' rx='7' ry='7' />
              </g>
            </g>

          </g>
        </svg>
      </div>
    );
  }
}

export default DogComponent;

function ActivateDogAnimation() {
  const select = function(s: any) {
    return document.querySelector(s);
  };
  // const selectAll = function(s) {
  //   return document.querySelectorAll(s);
  // };
  const container = select('.container');
  // const dogSVG = select('.dogSVG');
  const dogSVG = select('.dogSVG');
  // const bone = select('#bone');
  const browL = select('#browL');
  const browR = select('#browR');
  const eyeSpinL = select('#eyeSpinL');
  const eyeSpinR = select('#eyeSpinR');
  const stageWidth =  600;
  const stageHeight = stageWidth;
  const mousePos = {x: 0,y: 0};

  TweenMax.set(container, {
    position: 'absolute',
    top: '50%',
    left: '50%',
    xPercent: -50,
    yPercent: -50
  })
  TweenMax.set('svg', {
    visibility: 'visible'
  })
  // TweenMax.set([nose, bone, '.eye'], {
  //   transformOrigin:'50% 50%'
  // })
  TweenMax.set(browL, {
    transformOrigin: '0% 50%'
  })
  TweenMax.set(browR, {
    transformOrigin: '100% 150%'
  })
  TweenMax.set([eyeSpinL,eyeSpinR], {
    transformOrigin: '65% 50%'
  })

  var eyeMaxY = 1;
  var browMaxY = 2;
  var browMaxRot = 0;
  var snoutMinY = 2;
  var noseMaxY = 12;

  dogSVG.onmousemove = function(e: any) {
    mousePos.x = ((stageWidth / 2) - e.offsetX) * -1;
    mousePos.y = ((stageHeight / 2) - e.offsetY) * -1;

    TweenMax.to('#eyeGroup',1, {
      x: mousePos.x / 20,
      y: ((mousePos.y / 12) > eyeMaxY) ? eyeMaxY : mousePos.y / 12
    })

    TweenMax.to(browL, 1, {
      rotation: ((mousePos.y / 25) > browMaxRot) ? browMaxRot : mousePos.y / 25
    })
    TweenMax.to(browR, 1, {
      rotation: -((mousePos.y / 15) > browMaxRot) ? -browMaxRot : -mousePos.y / 15
    })
    TweenMax.to('#browGroup', 1, {
      x: mousePos.x / 40,
      y: ((mousePos.y / 25) > browMaxY) ? browMaxY : mousePos.y / 25
    })

    TweenMax.to('#snout', 1, {
      x: mousePos.x / 30,
      y: ((mousePos.y / 60) < snoutMinY) ? snoutMinY : mousePos.y / 60
    })

    TweenMax.to('#logo-nose', 1, {
      x: mousePos.x / 8,
      y: ((mousePos.y / 10) > noseMaxY) ? noseMaxY : mousePos.y / 10
    })

    // TweenMax.to(bone, 1, {
    //   x:e.offsetX - (bone.getBBox().width/2),
    //   y:e.offsetY- (bone.getBBox().height/2),
    //   ease:Elastic.easeOut.config(0.7, 0.8)
    // })

    TweenMax.to('#earL', 1, {
      x: -(mousePos.x / 50),
      y: -(mousePos.y / 50)
    })

    TweenMax.to('#earR', 1, {
      x: -(mousePos.x / 50),
      y: -(mousePos.y / 50)
    })

    TweenMax.to('#dogGroup', 1, {
      x: (mousePos.x / 23),
      y: (mousePos.y / 23)
    })

    // TweenMax.set(noseShineTL,{
    //   time:noseShineTL.duration() - ((e.offsetX/stageWidth) * noseShineTL.duration())
    // })
  }


  function blink() {

    TweenMax.to('.eye', 0.1, {
      attr: {
        ry: 0
      },
      repeat: 1,
      yoyo: true,
      onComplete: blink,
      delay: Math.random() * 10
    })

  }

  function sniff() {

    TweenMax.to('#logo-nose', 0.1, {
      scaleX: 1.1,
      repeat: 1,
      yoyo: true,
      onComplete: sniff,
      delay: Math.random()
    })
  }

  blink();
  sniff();
  dogSVG.onmousemove({offsetX: 300, offsetY: 60 })
}

