const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  try {
    const page = await browser.newPage({viewport:{width:1280,height:800}});
    const errors=[]; page.on('pageerror', e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:8765/?eco=1#local', {waitUntil:'domcontentloaded',timeout:90000});
    await page.waitForFunction(()=>window.__xq?.started && !__xq.busy && __xq.pieceHoverC, null,{timeout:90000});
    await page.waitForTimeout(1800);
    const snapshot=()=>page.evaluate(()=>JSON.stringify(__xq.game.board));
    const before=await snapshot();
    const state=()=>page.evaluate(()=>__xq.pieceHoverC.state);
    async function hover(f,r) {
      const [x,y]=await page.evaluate(([f,r])=>{const v=Board.pos(f,r,Board.TOP+.10).project(Core.camera);return [(v.x+1)*innerWidth/2,(1-v.y)*innerHeight/2]},[f,r]);
      await page.mouse.move(x,y);
      await page.waitForFunction(([f,r])=>{const s=__xq.pieceHoverC.state;return s.target?.f===f && s.target?.r===r && s.opacity===1},[f,r],{timeout:15000});
      return state();
    }
    const red=await hover(4,3);
    assert.ok(Math.abs(red.layerOpacity[0]-.434)<1e-8);
    assert.ok(Math.abs(red.layerOpacity[1]-.686)<1e-8);
    assert.equal(await page.evaluate(()=>Board.root.getObjectByName('piece-hover-c').children.length),8);
    console.log('PASS red hover, four segments, both alpha layers at 70 percent');
    await hover(4,6);console.log('PASS enemy hover');
    await page.mouse.move(2,2);await page.waitForTimeout(350);assert.equal((await state()).visible,false);
    await hover(4,3);
    await page.evaluate(()=>document.getElementById('gl').dispatchEvent(new PointerEvent('pointermove',{pointerType:'touch',clientX:640,clientY:500,bubbles:true})));
    assert.equal((await state()).visible,false);console.log('PASS leave and touch clear');
    await hover(4,3);
    await page.evaluate(()=>{const d=document.createElement('div');d.id='hover-test-modal';d.className='modal';document.body.appendChild(d)});
    await page.waitForTimeout(350);assert.equal((await state()).visible,false);
    await page.evaluate(()=>document.getElementById('hover-test-modal').remove());
    assert.equal(await snapshot(),before);console.log('PASS modal clears and board unchanged');
    await hover(4,3);await page.mouse.down();await page.mouse.move(680,500,{steps:3});assert.equal((await state()).visible,false);await page.mouse.up();
    console.log('PASS drag clears');
    await page.emulateMedia({reducedMotion:'reduce'});await hover(4,3);assert.equal((await state()).opacity,1);
    await page.evaluate(()=>{Core.Time.hold=true});await page.waitForTimeout(350);assert.equal((await state()).visible,false);await page.evaluate(()=>{Core.Time.hold=false});
    console.log('PASS reduced motion and pause clears');
    assert.deepEqual(errors,[]);console.log('PASS no browser JavaScript errors');
  } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
