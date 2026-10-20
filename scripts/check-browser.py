"""Functional map-edition regressions; requires Playwright and Chromium.

Run with the development or static server already running. This intentionally
uses WebGL-disabled browsers and makes no GPU or real-device performance claim.
"""
import argparse,asyncio,json,os,pathlib
from playwright.async_api import async_playwright,expect
async def check(url,output):
 results=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-webgl','--disable-gpu'])
  try:
   for name,width,height in [('desktop',1365,900),('phone',390,844),('small-phone',320,568),('landscape',844,390),('tablet',768,1024)]:
    page=await browser.new_page(viewport={'width':width,'height':height},reduced_motion='reduce');page.set_default_timeout(10000);errors=[];requests=[]
    page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url))
    await page.add_init_script('''window.fcFrames=0;const original=requestAnimationFrame;window.requestAnimationFrame=callback=>original(time=>{window.fcFrames++;callback(time)});''')
    response=await page.goto(url,wait_until='domcontentloaded');assert response.status==200
    await page.locator('#loading').wait_for(state='hidden');await page.wait_for_timeout(150)
    assert not any(any(part in request for part in ['/three.','/reconstruction.js','/terrain.json','/aerial.jpg']) for request in requests),'Map path loaded a 3D dependency'
    await expect(page.locator('#scenario-panel')).to_have_class('panel collapsed')
    await expect(page.locator('#place-select')).to_be_visible();await page.locator('#place-select').select_option('river');await expect(page.locator('#place-title')).to_have_text('Poudre River')
    # Every navigation control must receive its center pointer, including landscape.
    for control in ['fly','walk','tour','home','label-toggle','focus','green-start']:
     hit=await page.locator('#'+control).evaluate('''e=>{const r=e.getBoundingClientRect(),t=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.bottom<=innerHeight&&r.right<=innerWidth&&!!t&&(e===t||e.contains(t))}''')
     assert hit,f'{name}: {control} is covered or outside the viewport'
    if output:await page.screenshot(path=str(output/f'{name}-initial.png'))
    await page.locator('#green-start').click();await page.locator('#compare').click();await expect(page.locator('#scenario-panel')).to_have_class('panel collapsed')
    slider=page.locator('#split-range');rect=await slider.bounding_box();await page.mouse.click(rect['x']+rect['width']*.8,rect['y']+rect['height']/2);assert int(await slider.input_value())>65,f'{name}: pointer comparison did not move'
    before=int(await slider.input_value());await slider.focus();await page.keyboard.press('ArrowLeft');assert int(await slider.input_value())<before,f'{name}: keyboard comparison did not move'
    if output:await page.screenshot(path=str(output/f'{name}-compare.png'))
    await page.get_by_label('Edit scenario',exact=True).click();await page.locator('#prompt').fill('do not add a tram');await page.locator('#simulate').click();await expect(page.locator('#panel-summary')).to_have_text('No tram');
    if width<=850 or height<=650:await expect(page.locator('#scenario-panel')).to_have_class('panel collapsed')

    if await page.locator('#collapse').get_attribute('aria-expanded')=='false':await page.get_by_label('Edit scenario',exact=True).click()
    await page.locator('#prompt').fill('purple elephants');await page.locator('#simulate').click();await expect(page.locator('#prompt-error')).to_be_visible();await expect(page.locator('#prompt-error')).to_contain_text('previous preview is unchanged');await expect(page.locator('#prompt')).to_have_attribute('aria-invalid','true')
    await page.locator('#info').click();await expect(page.get_by_role('dialog',name='About this reconstruction')).to_be_visible();await page.keyboard.press('Escape');await expect(page.locator('#about')).not_to_be_visible()
    # A stationary map should not keep an animation loop alive.
    await page.wait_for_timeout(200);frames=await page.evaluate('fcFrames');await page.wait_for_timeout(400);idle_frames=await page.evaluate('fcFrames')-frames;assert idle_frames==0,f'{name}: map has {idle_frames} idle animation callbacks'
    assert not errors,errors
    results.append({'viewport':name,'size':[width,height],'status':'passed','idle_animation_callbacks':idle_frames,'requests':requests})
    await page.close()
   page=await browser.new_page();await page.goto(url+'?preset=green&view=map');await page.locator('#loading').wait_for(state='hidden');await expect(page.locator('#alternate')).to_have_attribute('aria-pressed','true');await expect(page.locator('#panel-summary')).to_contain_text('Car-free streets');await page.close()
   # Asset failures provide recovery instead of leaving an endless loader.
   page=await browser.new_page();await page.route('**/data/city.json',lambda route:route.fulfill(status=503,body='Unavailable'));await page.goto(url);await expect(page.locator('#loadtext')).to_have_text('City data could not load.');await expect(page.get_by_role('button',name='Try again',exact=True)).to_be_visible();await page.close()
  finally:await browser.close()
 print(json.dumps({'viewports':results,'preset_entry':'passed','asset_failure_recovery':'passed','rendering':'WebGL-disabled map edition'},indent=2))
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:5176');parser.add_argument('--output',type=pathlib.Path);args=parser.parse_args()
 if args.output:args.output.mkdir(parents=True,exist_ok=True)
 asyncio.run(check(args.url.rstrip('/')+'/',args.output))
