# sparks-accmap

Accountability map visualization

## viewing

This project's `master` branch is automatically deployed to:

https://sparksnetwork.github.io/sparks-accmap/index.html

## updating

There is a build script that generates the json data file used by the visualization.

### credentials required

The following env vars have to be set so that the build script:

* TOGGL_API_TOKEN
* TOGGL_WORKSPACE_ID

You also need a `firebase.json` credentials file for the `sparks-bi` firebase in the root directory of the project to run the build script.

### rebuilding

Run `npm run build` to regenerate the data from firebase and toggl.

That will update the `dataset.json` file in the project.

### pushing to production

Simply commit and push the `master` branch and it will update the live page.