Forked from https://github.com/Wintervorst/iitc/raw/master/plugins/totalrecon/

## If you want to have a map of your submitted portals and potential portals on multiple devices and share it with other players. This script makes that possible.

<img src="https://gitlab.com/AlfonsoML/wayfarer/raw/master/assets/markersonthemap.png"></img><br/>
## Tap/click on the Intel map to add and edit locations<br/>
<img src="https://gitlab.com/AlfonsoML/wayfarer/raw/master/assets/mapwitheditdialogue.png"></img><br/>
## The portals are stored in a Google Sheet for easy (bulk) management<br/>
<img src="https://gitlab.com/AlfonsoML/wayfarer/raw/master/assets/filledsheet.png"></img><br/>

## It's easy to use, but it requires a bit of configuration if you want to create your own google sheet. However, when you've completed the setup, it is a matter of installing the userscript and you are good to go.

## A. If you want to make use of an existing sheet. Install the <a href="https://gitlab.com/AlfonsoML/wayfarer/raw/master/wayfarer-planner.user.js?inline=false">userscript</a>, load IITC and enter the scripturl.<br/>
<img src="https://gitlab.com/AlfonsoML/wayfarer/raw/master/assets/enterscripturl.png"></img><br/>
## You can test it out with this script url
Test script url: https://script.google.com/macros/s/AKfycbyBx4dR0s8v1ZEsnuKFARfmibHiqTY20qO0EU3vRML4y4XW6wmu/exec Keep in mind that this a shared sheet, after checking that the plugin works as expected you must use your own sheet instead of this one.

## List of functions is at the end of this page

## B. If you want to create your own sheet, you should follow these instructions:

#### 1. Go to: https://docs.google.com/spreadsheets/u/0/
#### 2. Start a new, blank, spreadsheet<br/>
<img src="https://gitlab.com/AlfonsoML/wayfarer/raw/master/assets/startnewspreadsheet.png"></img><br/>

#### 3. Go to ‘Tools’ -> ‘Script editor’<br/>
<img src="https://gitlab.com/AlfonsoML/wayfarer/raw/master/assets/toolsmenu.png"></img><br/>

#### 4. Remove content in Code.gs and paste the content from this <a href="Code.gs">Code.gs</a> file and click the Save Button<br/>
<img src="https://gitlab.com/AlfonsoML/wayfarer/raw/master/assets/setsheetscriptcontent.png"></img><br/>

#### 5. Select the ‘initialSetup’ function<br/>
<img src="https://gitlab.com/AlfonsoML/wayfarer/raw/master/assets/set initialsetup.png"></img><br/>

#### 6. Click the ‘play’ button to run<br/>
<img src="https://gitlab.com/AlfonsoML/wayfarer/raw/master/assets/run initialsetup.png"></img><br/>

#### 7. A dialogue pops up, choose ‘review permissions’<br/>
<img src="https://gitlab.com/AlfonsoML/wayfarer/raw/master/assets/authorizationrequired.png"></img><br/>

#### 8. Choose the appropriate google account<br/>
<img src="https://gitlab.com/AlfonsoML/wayfarer/raw/master/assets/choosegoogleaccount.png"></img><br/>

#### 9. Choose advanced<br/>
<img src="https://gitlab.com/AlfonsoML/wayfarer/raw/master/assets/chooseadvanced.png"></img><br/>

#### 10. Go to ‘Untitled project’<br/>
<img src="https://gitlab.com/AlfonsoML/wayfarer/raw/master/assets/gotountitled.png"></img><br/>

#### 11. Choose your Google+ account and ‘Allow’<br/>
<img src="https://gitlab.com/AlfonsoML/wayfarer/raw/master/assets/choose allow.png"></img><br/>

#### 12. The initialsetup will be run and the sheet will be prepared with the proper columns and column settings<br/>
<img src="https://gitlab.com/AlfonsoML/wayfarer/raw/master/assets/sheetcolumnsfilled.png"></img><br/>

#### 13. Go back to script and choose ‘Publish’->’Deploy as WebApp’<br/>
<img src="https://gitlab.com/AlfonsoML/wayfarer/raw/master/assets/publishwebapp.png"></img><br/>

#### 14. Set ‘Who has access to the app” to Anyone even anonymous.<br/>
<img src="https://gitlab.com/AlfonsoML/wayfarer/raw/master/assets/deploywebapp.png"></img><br/>

#### 15. And choose ‘Deploy’<br/>
<img src="https://gitlab.com/AlfonsoML/wayfarer/raw/master/assets/webapppublished.png"></img><br/>

#### 16. Copy the ‘Current web app URL’. You will be needing it later on.<br/>

#### 17. Install the <a href="https://gitlab.com/AlfonsoML/wayfarer/raw/master/wayfarer-planner.user.js">userscript</a>. On first launch you will be prompted to enter this URL.<br/>
<img src="https://gitlab.com/AlfonsoML/wayfarer/raw/master/assets/enterscripturl.png"></img><br/>

You will need to share this URL with all people and/or devices who will share the same set of data.

## How to update the code.gs script
If for some reason there's a need to update the script in code.gs, follow these steps
1. Replace the existing code with the new one of code.gs  
2. Follow from step 13 above: Publish -> Deploy as WebApp.  
3. In the dialog of step 14, mark it as **New** Project version.   
4. Click deploy and when you get the dialog of step 15 you're done.  

## List of functions
A new link "Total Recon" is added in the sidebar, you can click it to open the settings dialog.<br />
<img src="https://gitlab.com/AlfonsoML/wayfarer/raw/master/assets/dialog.png"></img><br/>
When you enable the "Click on the map to add markers" checkbox, then you can click on the map to add new markers<br />
<img src="https://gitlab.com/AlfonsoML/wayfarer/raw/master/assets/clickonmap.png"></img><br/>

You will see that all input and changes will be stored in your google sheet. You can share the sheet with whomever you like, or keep it to yourself. Removing markers is a matter of removing a row from the sheet.<br/>
<img src="https://gitlab.com/AlfonsoML/wayfarer/raw/master/assets/filledsheet.png"></img>/<br/>

You can toggle several layers on and off in the layer menu.<br/>
<img src="https://gitlab.com/AlfonsoML/wayfarer/raw/master/assets/layerselection.png"></img><br/>

To refresh the markerset you can use the "Update candidate data" link in the dialog.

## Differences from the original TotalRecon
I suggested to provide patches to the original version in order to fix some issues and improvements, but the offer was declined and told to create my own fork, so here it is.  
1. Removed some unused code from previous plugins and fix errors like one that happened when a layer is enabled/disabled.  
2. Don't use highlighters, instead provide a dialog with an option to enable the addition of new markers.  
3. The dialog allows to update the URL and refresh when required.  
4. Add options to track also Edit requests.
5. Allow to remove candidates from the map.  
6. Layout improvements to the edit dialog.

## Integration with Wayfarer
There's an additional Tampermonkey plugin: <a href='https://gitlab.com/AlfonsoML/wayfarer/raw/master/wayfarer-exporter.user.js?inline=false'>Wayfarer Exporter</a> that parses your nominations when you load https://wayfarer.nianticlabs.com/nominations and automatically adds them to your data.  
When you load it the first time it will ask you for the script url, use the same one that you have configured in IITC and after a few seconds reload IITC to check that your nominations are there.
