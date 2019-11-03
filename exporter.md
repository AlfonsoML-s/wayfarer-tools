## Wayfarer Exporter

The "Wayfarer exporter" is a plugin for [Tampermonkey](https://tampermonkey.net/) (not IITC or IITCm) that it's run automatically when you load in [Wayfarer the page with the history of your nominations](https://wayfarer.nianticlabs.com/nominations).  
The first time it will prompt you for the URL that you are using in Wayfarer Planner to store the data about your candidates and then it will proceed to update that data with your nominations.

Let's suppose that you haven't added anything anything in IITC, then it will add a "submitted" marker in IITC for every candidate that you have with the status of "In voting" or "In queue".  
Now these markers will be tracked by the Exporter plugin, so when you load the page again in the future, if they are approved they will be removed from the map (you no longer need them).  
On the other hand, if they are rejected, marked as duplicate or if you retract those candidates, they will be marked on the map as "rejected", so you can easily remember the places to remove (maybe the PoI has already been approved to another person), or to send them again in the future.
Of course, if you've planned previously you already have a marker on those locations, so the plugin tries to find if you have any such candidate less that 20 meters away from the new ones that it finds, and so it removes the existing ones to prevent cluttering your map with duplicated markers.


Still testing:  
If you want to run it on mobile, you'll have to use a browser that supports User scripts (like Firefox mobile with Tampermonkey), or use a more complex method:  
Copy all the code, then you can pre-process it in https://javascript-minifier.com/ to reduce it.  
Then, copy that code in https://mrcoles.com/bookmarklet/ 
The last step is that you must generate a bookmark in your browser and update its URL with the output of this page, now when you load the page with your wayfarer nominations you use that bookmark and the code will run, remember that this script isn't installed and you have to click the bookmark everytime that you want to update your data.
