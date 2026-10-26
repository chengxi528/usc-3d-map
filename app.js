
// Set up access to Cesium ion services.
Cesium.Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IlN6V0NXVHdoMW1taGpZZmYiLCJqdGkiOiJiNTAxZDM4NS0zMGY0LTQwNzMtOTY5Zi0xNzRjYjM4NDU3MzgiLCJpZCI6NTM0OTU4LCJzdWIiOiJjYXRoeTUzOTUzOSIsImlzcyI6Imh0dHBzOi8vYXBpLmNlc2l1bS5jb20iLCJhdWQiOiJVU0MgQ2FtcHVzIFdlYnNpdGUiLCJpYXQiOjE3OTMwMzY5NzR9.kUawuWRaWcScwIw55RKn-0LvkkmRQj-nJf7JF75edBU";
const projectLayers = {};
// Create a viewer without Cesium ion services.
const viewer = new Cesium.Viewer("cesiumContainer", {
  baseLayer: false,
  baseLayerPicker: false,
  geocoder: false,
  animation: false,
  timeline: false,
  sceneModePicker: false
});

// Add an OpenStreetMap background.
const background = new Cesium.UrlTemplateImageryProvider({
  url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  maximumLevel: 19,
  credit: new Cesium.Credit(
    '© <a href="https://www.openstreetmap.org/copyright">' +
    "OpenStreetMap contributors</a>",
    true
  )
});

viewer.imageryLayers.addImageryProvider(background);

// Approximate center of USC's University Park Campus.
// Coordinates are longitude first, then latitude.
const uscLongitude = -118.2851;
const uscLatitude = 34.0224;

// Add a campus marker.
viewer.entities.add({
  name: "USC — University Park Campus",
  position: Cesium.Cartesian3.fromDegrees(
    uscLongitude,
    uscLatitude
  ),
  point: {
    pixelSize: 12,
    color: Cesium.Color.GOLD,
    outlineColor: Cesium.Color.DARKRED,
    outlineWidth: 3,
    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
  },
  description: "Our USC 3D campus project starts here."
});

// Start above Los Angeles, looking toward USC.
viewer.camera.flyTo({
  destination: Cesium.Cartesian3.fromDegrees(
    uscLongitude,
    uscLatitude - 0.006,
    1100
  ),
  orientation: {
    heading: 0,
    pitch: Cesium.Math.toRadians(-55),
    roll: 0
  },
  duration: 2
});
// Make rotating and tilting easier on a Mac trackpad.
viewer.scene.screenSpaceCameraController.tiltEventTypes = [
  Cesium.CameraEventType.MIDDLE_DRAG,
  Cesium.CameraEventType.PINCH,
  {
    eventType: Cesium.CameraEventType.LEFT_DRAG,
    modifier: Cesium.KeyboardEventModifier.ALT
  }
];
// Update the existing navigation help for Mac users.
const helpContainer = viewer.navigationHelpButton.container;

const mouseHelp = helpContainer.querySelector(
  ".cesium-click-navigation-help"
);

mouseHelp.innerHTML = `
  <div class="mac-controls">
    <strong>Mouse / Mac trackpad</strong>

    <p><b>Move:</b> Click, hold, and drag.</p>

    <p><b>Zoom:</b> Scroll with two fingers,
    or use the mouse wheel.</p>

    <p><b>Rotate:</b> Hold Option ⌥, then click,
    hold, and drag left or right.</p>

    <p><b>Tilt:</b> Hold Option ⌥, then click,
    hold, and drag up or down.</p>

    <small>The Touch tab is for touchscreens,
    not Mac trackpads.</small>
  </div>
`;
// loadBuildings function
async function loadBuildings() {
  try {
    // Add real ground elevation.
    viewer.terrainProvider =
      await Cesium.createWorldTerrainAsync();

    // Add buildings positioned above that ground.
    const buildings =
      await Cesium.createOsmBuildingsAsync();

    viewer.scene.primitives.add(buildings);
    registerProjectLayer("osm", buildings);
    console.log("Terrain and buildings loaded.");
  } catch (error) {
    console.error("Could not load the campus:", error);

    alert(
      "Terrain or buildings could not load. " +
      "Check your Cesium token and internet connection."
    );
  }
}

loadBuildings();

// function loadStudyArea
async function loadStudyArea() {
  try {
    // Read the geographic features from our local file.
    const studyArea = await Cesium.GeoJsonDataSource.load(
      "data/usc-study-area.geojson",
      {
        clampToGround: true
      }
    );

    studyArea.name = "USC prototype study area";

    // Copy the list before adding outline entities.
    const features = [...studyArea.entities.values];

    for (const feature of features) {
      if (!feature.polygon) continue;

      // Style the interior.
      feature.polygon.material =
        Cesium.Color.fromCssColorString("#FFCC00")
          .withAlpha(0.15);

      feature.polygon.classificationType =
        Cesium.ClassificationType.TERRAIN;

      feature.polygon.outline = false;

      // Draw a separate ground-following border.
      const hierarchy = feature.polygon.hierarchy.getValue(
        Cesium.JulianDate.now()
      );

      const positions = hierarchy.positions;

      studyArea.entities.add({
        name: "Study-area outline",
        polyline: {
          positions: [...positions, positions[0]],
          width: 3,
          material:
            Cesium.Color.fromCssColorString("#990000"),
          clampToGround: true,
          classificationType:
            Cesium.ClassificationType.TERRAIN
        }
      });
    }

    await viewer.dataSources.add(studyArea);
    registerProjectLayer("boundary", studyArea);
  } catch (error) {
    console.error("Study-area loading failed:", error);

    alert(
      "Could not load the study area. Check that " +
      "data/usc-study-area.geojson exists and contains valid JSON."
    );
  }
}

loadStudyArea();

//function loadLandmarks
async function loadLandmarks() {
  try {
    const landmarks = await Cesium.GeoJsonDataSource.load(
      "data/usc-landmarks.geojson",
      {
        clampToGround: true
      }
    );

    landmarks.name = "USC landmarks";

    const time = Cesium.JulianDate.now();

    for (const landmark of landmarks.entities.values) {
      const properties = landmark.properties;

      landmark.name = properties.name.getValue(time);
      landmark.description =
        properties.description.getValue(time);

      // Replace the default pin with a small gold dot.
      landmark.billboard = undefined;

      landmark.point = new Cesium.PointGraphics({
        pixelSize: 10,
        color: Cesium.Color.GOLD,
        outlineColor: Cesium.Color.DARKRED,
        outlineWidth: 2,
        heightReference:
          Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      });

      // Add a readable name above the dot.
      landmark.label = new Cesium.LabelGraphics({
        text: landmark.name,
        font: "14px sans-serif",
        fillColor: Cesium.Color.WHITE,
        showBackground: true,
        backgroundColor:
          Cesium.Color.BLACK.withAlpha(0.75),
        pixelOffset: new Cesium.Cartesian2(0, -24),
        heightReference:
          Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        distanceDisplayCondition:
          new Cesium.DistanceDisplayCondition(0, 2500)
      });
    }

    await viewer.dataSources.add(landmarks);
    registerProjectLayer("landmarks", landmarks);
  } catch (error) {
    console.error("Could not load landmarks:", error);

    alert(
      "Could not load landmarks. Check " +
      "data/usc-landmarks.geojson and refresh."
    );
  }
}

loadLandmarks();
// function loadCampusBuildings
async function loadCampusBuildings() {
  try {
    const campus = await Cesium.GeoJsonDataSource.load(
      "data/usc-buildings.geojson",
      {
        clampToGround: false
      }
    );

    campus.name = "USC buildings — estimated heights";

    const time = Cesium.JulianDate.now();

    for (const building of campus.entities.values) {
      if (!building.polygon) continue;

      const properties =
        building.properties?.getValue(time) ?? {};

      const value = Number(properties.model_height_m);

      // Use 12 metres if the height field is missing or invalid.
      const height =
        Number.isFinite(value) && value > 0 ? value : 12;

      building.name = properties.name || "Campus building";

      const polygon = building.polygon;

      // Set the building base and roof relative to terrain.
      polygon.perPositionHeight = false;
      polygon.height = 0;
      polygon.heightReference =
        Cesium.HeightReference.RELATIVE_TO_GROUND;

      polygon.extrudedHeight = height;
      polygon.extrudedHeightReference =
        Cesium.HeightReference.RELATIVE_TO_GROUND;

      polygon.material =
        Cesium.Color.fromCssColorString("#D8B89A");

      polygon.outline = true;
      polygon.outlineColor =
        Cesium.Color.fromCssColorString("#735747");

      building.description =
        "<p>Prototype building model.</p>" +
        "<p>Estimated height: " + height + " metres.</p>" +
        "<p>Footprint source: OpenStreetMap contributors.</p>";
    }

    await viewer.dataSources.add(campus);
    registerProjectLayer("campus", campus);
  } catch (error) {
    console.error("Campus building loading failed:", error);

    alert(
      "Could not load campus buildings. Check that " +
      "data/usc-buildings.geojson exists and contains valid GeoJSON."
    );
  }
}

loadCampusBuildings();

// Add control functions
function registerProjectLayer(name, layer) {
  projectLayers[name] = layer;
  updateProjectLayers();
}

function updateProjectLayers() {
  const mode = document.getElementById("buildingMode").value;

  // Display only the selected building model.
  if (projectLayers.campus) {
    projectLayers.campus.show = mode === "campus";
  }

  if (projectLayers.osm) {
    projectLayers.osm.show = mode === "osm";
  }

  if (projectLayers.boundary) {
    projectLayers.boundary.show =
      document.getElementById("showBoundary").checked;
  }

  if (projectLayers.landmarks) {
    projectLayers.landmarks.show =
      document.getElementById("showLandmarks").checked;
  }

  const note = document.getElementById("modelNote");

  if (mode === "campus") {
    note.textContent = projectLayers.campus
      ? "Our model uses estimated heights. The study area is approximate."
      : "Campus model not loaded yet. Check for a loading error if this persists.";
  } else if (mode === "osm") {
    note.textContent = projectLayers.osm
      ? "Cesium OSM Buildings: coverage and detail vary. Heights are not verified by this project."
      : "Cesium buildings not loaded yet. Check for a loading error if this persists.";
  } else {
    note.textContent = "Building models are hidden.";
  }

  // Close any information panel for a previously selected feature.
  viewer.selectedEntity = undefined;
}

document.getElementById("buildingMode")
  .addEventListener("change", updateProjectLayers);

document.getElementById("showBoundary")
  .addEventListener("change", updateProjectLayers);

document.getElementById("showLandmarks")
  .addEventListener("change", updateProjectLayers);

document.getElementById("returnToCampus")
  .addEventListener("click", () => {
    viewer.trackedEntity = undefined;
    viewer.selectedEntity = undefined;

    viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        uscLongitude,
        uscLatitude - 0.006,
        1100
      ),
      orientation: {
        heading: 0,
        pitch: Cesium.Math.toRadians(-55),
        roll: 0
      },
      duration: 1.5
    });
  });

updateProjectLayers();

//Add the search behavior

function renderBuildingSearch() {
  const input = document.getElementById("buildingSearch");
  const results = document.getElementById("searchResults");
  const message = document.getElementById("searchMessage");

  const query = input.value.trim().toLowerCase();

  results.replaceChildren();
  message.textContent = "";

  if (query.length < 2) {
    message.textContent = "Type at least two letters.";
    return;
  }

  const campus = projectLayers.campus;

  if (!campus) {
    message.textContent = "Campus building data is not loaded yet.";
    return;
  }

  const matches = campus.entities.values.filter((building) => {
    return (
      building.polygon &&
      building.name &&
      building.name !== "Campus building" &&
      building.name.toLowerCase().includes(query)
    );
  });

  if (matches.length === 0) {
    message.textContent = "No matching named building in our dataset.";
    return;
  }

  message.textContent =
    matches.length > 8
      ? `${matches.length} matches. Showing the first 8.`
      : `${matches.length} matching building(s).`;

  for (const building of matches.slice(0, 8)) {
    const item = document.createElement("li");
    const button = document.createElement("button");

    button.type = "button";
    button.textContent = building.name;

    button.addEventListener("click", async () => {
      // Search results belong to our local campus model.
      document.getElementById("buildingMode").value = "campus";
      updateProjectLayers();

      viewer.trackedEntity = undefined;

      try {
        const arrived = await viewer.flyTo(building, {
          duration: 1.3,
          offset: new Cesium.HeadingPitchRange(
            0,
            Cesium.Math.toRadians(-40),
            0
          )
        });

        if (arrived) {
          viewer.selectedEntity = building;
        }
      } catch (error) {
        console.error("Building navigation failed:", error);
        message.textContent = "Could not navigate to that building.";
      }
    });

    item.appendChild(button);
    results.appendChild(item);
  }
}

document.getElementById("buildingSearch")
  .addEventListener("input", renderBuildingSearch);

renderBuildingSearch();
//registerPr
function registerProjectLayer(name, layer) {
  projectLayers[name] = layer;
  updateProjectLayers();

  if (name === "campus") {
    renderBuildingSearch();
  }
}
