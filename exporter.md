## Wayfarer Exporter

The "Wayfarer exporter" is a plugin for [Tampermonkey](https://tampermonkey.net/) (not IITC or IITCm) that it's run automatically when you load in [Wayfarer the page with the history of your nominations](https://wayfarer.nianticlabs.com/nominations).  
The first time it will prompt you for the URL that you are using in [Wayfarer Planner](https://gitlab.com/AlfonsoML/wayfarer) to store the data about your candidates and then it will proceed to update that data with your nominations.

### How does it handle candidates:
Let's suppose that you haven't added anything anything in IITC, then it will add a "submitted" marker in IITC for every candidate that you have with the status of "In voting" or "In queue".  
Now these markers will be tracked by the Exporter plugin, so when you load the page again in the future, if they are approved they will be removed from the map (you no longer need them).  
On the other hand, if they are rejected, marked as duplicate or if you retract those candidates, they will be marked on the map as "rejected", so you can easily remember the places to remove (maybe the PoI has already been approved to another person), or to send them again in the future.
Of course, if you've planned previously you already have a marker on those locations, so the plugin tries to find if you have any such candidate less that 20 meters away from the new ones that it finds, and so it removes the existing ones to prevent cluttering your map with duplicated markers.

## Install
You must be running the Tampermonkey extension in your browser (IITC mobile doesn't work), and add [this script](https://gitlab.com/AlfonsoML/wayfarer/raw/master/wayfarer-exporter.user.js?inline=false).  
Now just login to Wayfarer and load the page with your nominations, the first time that you load it you'll be prompted for the URL of the script that you're using in Wayfarer Planner, paste it and wait a few seconds, then load in another tab IITC and you'll see markers for your pending nominations.  
Afterwards you only have to load the page and wait a few seconds after all your candidates are shown.

## How to Install without Tampermonkey.
This is a very simple script that doesn't really require Tampermonkey, so if your browser doesn't support it (for example you're on mobile with Chrome, and maybe it also works on iOS), then you can install it from the URL bar.  
Copy this code into your URL bar (check that it starts with ```javascript:``` as the browser might remove it) and press enter, then you should see the "Exporter" entry below the Nominations option in the sidebar

`javascript:(function() {var s = document.createElement('script'); s.src='https://glcdn.githack.com/AlfonsoML/wayfarer/raw/master/wayfarer-exporter.user.js'; s.type='text/javascript'; document.body.appendChild(s);})()`

There are two problems with this option: the first one is that if you reload the page then you must add it again, you might want to create a bookmark (this is why this technique is called 'bookmarklets') to do it easily.  
The second problem is that if I push any change to the code you won't get it, in order to be able to insert the javascript I'm using a 3rd party service that keeps the data cached for a whole year, so it requires a new URL for each change.
