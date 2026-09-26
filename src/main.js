// ============================================================================
// SASA MINE — 3D TERRAIN VIEWER
// Person 4 — Three.js / GLB Viewer / Flythrough / Terrain Analysis
// ============================================================================

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import "./style.css";


// ============================================================================
// HELPER
// ============================================================================

const $ = (id) => document.getElementById(id);


// ============================================================================
// CONFIGURATION
// ============================================================================

// Person 2 grid
const GRID_ROWS = 1024;
const GRID_COLS = 1024;

// Person 3 currently downsamples:
// 1024 x 1024 -> grid[::2, ::2] -> 512 x 512 mesh
const DEFAULT_MESH_ROWS = 512;
const DEFAULT_MESH_COLS = 512;
const DEFAULT_GRID_STEP = 2;

// Person 3 generated terrain is Z-up.
// Three.js scene is Y-up.
// Therefore GLB is rotated -90 degrees around X.
const SOURCE_UP_AXIS = "z";

// Keep null until backend gives you a real endpoint.
const BACKEND_ENDPOINT = null;

const IMAGE_FIELD_NAME = "image";
const RESPONSE_GLB_URL_FIELD = "glbUrl";

const FLY_DURATION = 24;

const LIGHT_BASE = {
  ambient: 1.15,
  hemisphere: 1.3,
  sun: 2.4,
};

const LIGHT_HILLSHADE = {
  ambient: 0.55,
  hemisphere: 0.7,
  sun: 3.4,
};


// ============================================================================
// DOM — TOP BAR
// ============================================================================

const systemStatusIndicatorEl = $("system-status-indicator");
const systemStatusValueEl = $("system-status-value");

const telemetryModelValueEl = $("telemetry-model-value");
const telemetryStatusValueEl = $("telemetry-status-value");

const tabEls = Array.from(document.querySelectorAll(".tab"));


// ============================================================================
// DOM — LEFT SIDEBAR
// ============================================================================

const navItemEls = Array.from(document.querySelectorAll(".nav-item"));

const statusIndicatorModelEl = $("status-indicator-model");
const statusValueModelEl = $("status-value-model");

const statusIndicatorGridEl = $("status-indicator-grid");
const statusValueGridEl = $("status-value-grid");

const statusIndicatorRenderEl = $("status-indicator-render");
const statusValueRenderEl = $("status-value-render");

const statusIndicatorCameraEl = $("status-indicator-camera");
const statusValueCameraEl = $("status-value-camera");


// ============================================================================
// DOM — VIEWER
// ============================================================================

const viewerEl = $("viewer") || document.body;

const viewportAzimuthEl = $("viewport-azimuth");
const viewportPitchEl = $("viewport-pitch");
const viewportCursorAltEl = $("viewport-cursor-alt");

const viewportGeorefEl = $("viewport-georef");
const viewportGridEl = $("viewport-grid");
const viewportMeshEl = $("viewport-mesh");


// ============================================================================
// DOM — TOOLBAR
// ============================================================================

const btnAutoRotate = $("btn-auto-rotate");
const btnToolbarWireframe = $("btn-toolbar-wireframe");
const btnToolbarHillshade = $("btn-toolbar-hillshade");
const btnToolbarSlopeHeatmap = $("btn-toolbar-slope-heatmap");


// ============================================================================
// DOM — CAMERA PRESETS
// ============================================================================

const btnCameraTop = $("btn-camera-top");
const btnCameraIso = $("btn-camera-iso");
const btnCameraProfile = $("btn-camera-profile");
const btnCameraResetPreset = $("btn-camera-reset");


// ============================================================================
// DOM — FLYTHROUGH
// ============================================================================

const btnFlythroughStart = $("btn-flythrough-start");
const btnFlythroughStop = $("btn-flythrough-stop");


// ============================================================================
// DOM — RIGHT SIDEBAR
// ============================================================================

const elevationPeakEl = $("elevation-peak");
const elevationBaseEl = $("elevation-base");
const elevationReliefEl = $("elevation-relief");

const elevationChartEl = $("elevation-profile-chart");

const metadataDatasetEl = $("metadata-dataset");
const metadataElevationRangeEl = $("metadata-elevation-range");
const metadataResolutionEl = $("metadata-resolution");
const metadataGridEl = $("metadata-grid");
const metadataMeshEl = $("metadata-mesh");


// ============================================================================
// DOM — LIGHTING
// ============================================================================

const solarAzimuthEl = $("solar-azimuth");
const solarAzimuthValueEl = $("solar-azimuth-value");

const solarElevationEl = $("solar-elevation");
const solarElevationValueEl = $("solar-elevation-value");

const zExaggerationEl = $("z-exaggeration");
const zExaggerationValueEl = $("z-exaggeration-value");


// ============================================================================
// DOM — SHADING
// ============================================================================

const btnHillshade = $("btn-hillshade");
const btnWireframe = $("btn-wireframe");
const btnSlopeHeatmap = $("btn-slope-heatmap");
const btnTerrainTexture = $("btn-terrain-texture");


// ============================================================================
// DOM — INSPECTION
// ============================================================================

const inspectionPanelEl = $("terrain-inspection-panel");

const inspectionRowEl = $("inspection-row");
const inspectionColEl = $("inspection-col");

const inspectionElevationEl = $("inspection-elevation");
const inspectionSlopeEl = $("inspection-slope");
const inspectionTerrainTypeEl = $("inspection-terrain-type");
const inspectionConfidenceEl = $("inspection-confidence");
const inspectionChangeEl = $("inspection-change");
const inspectionBeforeEl = $("inspection-before");
const inspectionDuringEl = $("inspection-during");


// ============================================================================
// DOM — BOTTOM COMMAND BAR
// ============================================================================

const btnUploadImage = $("btn-upload-image");
const inputImage = $("input-image");

const btnLoadGlb = $("btn-load-glb");
const inputGlb = $("input-glb");

const btnLoadGrid = $("btn-load-grid");
const inputGrid = $("input-grid");

const btnManualNavigation = $("btn-manual-navigation");
const btnCameraResetBottom = $("btn-camera-reset-bottom");


// ============================================================================
// DOM — LOADING
// ============================================================================

const loadingOverlayEl = $("loading-overlay");
const loadingTitleEl = $("loading-title");
const loadingMessageEl = $("loading-message");
const loadingProgressEl = $("loading-progress");


// ============================================================================
// DOM — SYSTEM MESSAGE
// ============================================================================

const systemMessageEl = $("system-message");
const systemMessageTextEl = $("system-message-text");


// ============================================================================
// TERRAIN MARKER
// ============================================================================

const terrainMarkerEl = $("terrain-marker");


// ============================================================================
// STATE
// IMPORTANT: STATE IS CREATED BEFORE applySolarPosition()
// This fixes the previous "Cannot access activeModel before initialization"
// error.
// ============================================================================

let activeModel = null;

let terrainData = null;
let gridLoaded = false;

let slopeRange = null;

let flying = false;
let flyPath = null;
const flyClock = new THREE.Clock(false);

let autoRotateOn = false;
let wireframeOn = false;
let hillshadeOn = false;
let slopeHeatmapOn = false;

let markerWorldPoint = null;

let solarAzimuthDeg = solarAzimuthEl
  ? Number(solarAzimuthEl.value)
  : 315;

let solarElevationDeg = solarElevationEl
  ? Number(solarElevationEl.value)
  : 42;

let zExaggeration = zExaggerationEl
  ? Number(zExaggerationEl.value)
  : 1.0;

let systemMessageHideTimer = null;


// ============================================================================
// SCENE
// ============================================================================

const scene = new THREE.Scene();


// ============================================================================
// CAMERA
// ============================================================================

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  30000
);

camera.position.set(500, 400, 500);


// ============================================================================
// RENDERER
// ============================================================================

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  powerPreference: "high-performance",
});

renderer.setPixelRatio(
  Math.min(window.devicePixelRatio || 1, 2)
);

renderer.setSize(
  window.innerWidth,
  window.innerHeight
);

renderer.outputColorSpace = THREE.SRGBColorSpace;

renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

renderer.domElement.style.width = "100%";
renderer.domElement.style.height = "100%";
renderer.domElement.style.display = "block";

viewerEl.appendChild(renderer.domElement);


// ============================================================================
// BACKGROUND
// ============================================================================

function createBackground() {

  const canvas = document.createElement("canvas");

  canvas.width = 1024;
  canvas.height = 1024;

  const ctx = canvas.getContext("2d");

  const gradient = ctx.createRadialGradient(
    512,
    350,
    20,
    512,
    512,
    800
  );

  gradient.addColorStop(0, "#101c28");
  gradient.addColorStop(0.35, "#08121c");
  gradient.addColorStop(0.7, "#03070d");
  gradient.addColorStop(1, "#010204");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1024, 1024);

  const texture = new THREE.CanvasTexture(canvas);

  texture.colorSpace = THREE.SRGBColorSpace;

  scene.background = texture;


  // ------------------------------------------------------------
  // Stars
  // ------------------------------------------------------------

  function createStars(
    count,
    radius,
    size,
    opacity
  ) {

    const positions = new Float32Array(
      count * 3
    );

    for (let i = 0; i < count; i++) {

      const r =
        radius *
        (0.65 + Math.random() * 0.35);

      const theta =
        Math.random() *
        Math.PI *
        2;

      const phi =
        Math.acos(
          2 * Math.random() - 1
        );

      positions[i * 3] =
        r *
        Math.sin(phi) *
        Math.cos(theta);

      positions[i * 3 + 1] =
        r *
        Math.cos(phi);

      positions[i * 3 + 2] =
        r *
        Math.sin(phi) *
        Math.sin(theta);
    }

    const geometry =
      new THREE.BufferGeometry();

    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(
        positions,
        3
      )
    );

    const material =
      new THREE.PointsMaterial({
        color: 0xffffff,
        size,
        transparent: true,
        opacity,
        depthWrite: false,
        fog: false,
        sizeAttenuation: true,
      });

    const points =
      new THREE.Points(
        geometry,
        material
      );

    scene.add(points);
  }

  createStars(
    1400,
    5000,
    2,
    0.5
  );

  createStars(
    400,
    3200,
    3.5,
    0.3
  );
}

createBackground();


// ============================================================================
// FOG
// ============================================================================

scene.fog = new THREE.Fog(
  0x03070d,
  1800,
  10000
);


// ============================================================================
// LIGHTING
// ============================================================================

const ambient =
  new THREE.AmbientLight(
    0xffffff,
    LIGHT_BASE.ambient
  );

scene.add(ambient);


const hemisphere =
  new THREE.HemisphereLight(
    0xeaf4ff,
    0x756650,
    LIGHT_BASE.hemisphere
  );

scene.add(hemisphere);


const sun =
  new THREE.DirectionalLight(
    0xfff2d9,
    LIGHT_BASE.sun
  );

sun.castShadow = true;

sun.shadow.mapSize.set(
  2048,
  2048
);

sun.shadow.camera.left = -1000;
sun.shadow.camera.right = 1000;
sun.shadow.camera.top = 1000;
sun.shadow.camera.bottom = -1000;

sun.shadow.camera.near = 10;
sun.shadow.camera.far = 5000;

sun.shadow.bias = -0.0003;

scene.add(sun);
scene.add(sun.target);


const fill =
  new THREE.DirectionalLight(
    0xdcecff,
    0.8
  );

scene.add(fill);
scene.add(fill.target);


// ============================================================================
// SOLAR POSITION
// ============================================================================

const SUN_DISTANCE = 1400;

function applySolarPosition() {

  const az =
    THREE.MathUtils.degToRad(
      solarAzimuthDeg
    );

  const el =
    THREE.MathUtils.degToRad(
      solarElevationDeg
    );

  const horizontal =
    Math.cos(el) *
    SUN_DISTANCE;

  const center =
    activeModel?.center ||
    new THREE.Vector3(
      0,
      0,
      0
    );

  sun.position.set(
    center.x +
    Math.cos(az) *
    horizontal,

    center.y +
    Math.sin(el) *
    SUN_DISTANCE,

    center.z +
    Math.sin(az) *
    horizontal
  );

  sun.target.position.copy(center);

  sun.target.updateMatrixWorld();
}


// ============================================================================
// NOW IT IS SAFE TO CALL
// ============================================================================

applySolarPosition();


// ============================================================================
// ORBIT CONTROLS
// ============================================================================

const controls =
  new OrbitControls(
    camera,
    renderer.domElement
  );

controls.enableDamping = true;
controls.dampingFactor = 0.06;

controls.enablePan = true;

controls.screenSpacePanning = false;

controls.mouseButtons = {
  LEFT: THREE.MOUSE.ROTATE,
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: THREE.MOUSE.PAN,
};

controls.minDistance = 2;
controls.maxDistance = 15000;

controls.maxPolarAngle =
  Math.PI * 0.495;

controls.autoRotateSpeed = 1.1;


// ============================================================================
// GLTF LOADER
// ============================================================================

const loader =
  new GLTFLoader();


// ============================================================================
// STATUS FUNCTIONS
// ============================================================================

function showSystemMessage(
  text,
  isError = false
) {

  if (
    !systemMessageEl ||
    !systemMessageTextEl
  ) {
    return;
  }

  systemMessageTextEl.textContent =
    text;

  systemMessageEl.classList.toggle(
    "is-error",
    isError
  );

  systemMessageEl.classList.add(
    "is-visible"
  );

  if (systemMessageHideTimer) {
    clearTimeout(
      systemMessageHideTimer
    );
  }

  systemMessageHideTimer =
    setTimeout(() => {

      systemMessageEl.classList.remove(
        "is-visible"
      );

    }, isError ? 6000 : 3500);
}


function setSystemStatus(
  word,
  isError = false,
  isBusy = false
) {

  if (systemStatusIndicatorEl) {

    systemStatusIndicatorEl.classList.toggle(
      "is-error",
      isError
    );

    systemStatusIndicatorEl.classList.toggle(
      "is-busy",
      isBusy
    );
  }

  if (systemStatusValueEl) {
    systemStatusValueEl.textContent =
      word;
  }

  if (telemetryStatusValueEl) {
    telemetryStatusValueEl.textContent =
      word;
  }
}


function setStatus(
  text,
  isError = false
) {

  showSystemMessage(
    text,
    isError
  );

  setSystemStatus(
    isError
      ? "ERROR"
      : "READY",
    isError,
    false
  );

  if (isError) {
    console.error(
      "[SASA MINE]",
      text
    );
  } else {
    console.log(
      "[SASA MINE]",
      text
    );
  }
}


function setStatusBusy(text) {

  showSystemMessage(
    text,
    false
  );

  setSystemStatus(
    "BUSY",
    false,
    true
  );

  console.log(
    "[SASA MINE]",
    text
  );
}


function setRowStatus(
  indicatorEl,
  valueEl,
  value,
  state
) {

  if (valueEl) {
    valueEl.textContent =
      value;
  }

  if (indicatorEl) {

    indicatorEl.classList.toggle(
      "is-busy",
      state === "busy"
    );

    indicatorEl.classList.toggle(
      "is-error",
      state === "error"
    );
  }
}


// ============================================================================
// LOADING OVERLAY
// ============================================================================

function showLoading(
  title = "SASA MINE",
  message = "Loading terrain model..."
) {

  if (loadingTitleEl) {
    loadingTitleEl.textContent =
      title;
  }

  if (loadingMessageEl) {
    loadingMessageEl.textContent =
      message;
  }

  if (loadingProgressEl) {
    loadingProgressEl.textContent =
      "0%";
  }

  loadingOverlayEl?.classList.remove(
    "is-hidden"
  );
}


function updateLoadingProgress(
  percent
) {

  if (loadingProgressEl) {

    loadingProgressEl.textContent =
      `${Math.round(percent)}%`;
  }
}


function hideLoading() {

  loadingOverlayEl?.classList.add(
    "is-hidden"
  );
}


// ============================================================================
// TABS
// ============================================================================

tabEls.forEach((tab) => {

  tab.addEventListener(
    "click",
    () => {

      tabEls.forEach(
        (t) =>
          t.classList.remove(
            "is-active"
          )
      );

      tab.classList.add(
        "is-active"
      );
    }
  );

});


// ============================================================================
// NAVIGATION ITEMS
// ============================================================================

navItemEls.forEach(
  (item) => {

    item.addEventListener(
      "click",
      () => {

        navItemEls.forEach(
          (i) => {

            i.classList.remove(
              "is-active"
            );

            i.removeAttribute(
              "aria-current"
            );

          }
        );

        item.classList.add(
          "is-active"
        );

        item.setAttribute(
          "aria-current",
          "true"
        );
      }
    );

  }
);


// ============================================================================
// MODEL PREPARATION
// ============================================================================

function prepareModel(root) {

  const maxAnisotropy =
    renderer.capabilities
      .getMaxAnisotropy();


  root.traverse(
    (object) => {

      if (!object.isMesh) {
        return;
      }

      object.castShadow = true;
      object.receiveShadow = true;


      // ------------------------------------------------------------
      // Normals
      // ------------------------------------------------------------

      if (
        object.geometry &&
        !object.geometry.attributes.normal
      ) {

        object.geometry.computeVertexNormals();

      }


      // ------------------------------------------------------------
      // Materials
      // ------------------------------------------------------------

      const materials =
        Array.isArray(object.material)
          ? object.material
          : [object.material];


      materials.forEach(
        (material) => {

          if (!material) {
            return;
          }

          material.side =
            THREE.DoubleSide;


          if (material.map) {

            material.map.colorSpace =
              THREE.SRGBColorSpace;

            material.map.anisotropy =
              maxAnisotropy;

            material.map.needsUpdate =
              true;
          }


          // Keep original GLB material.
          if (
            material.isMeshStandardMaterial ||
            material.isMeshPhysicalMaterial
          ) {

            material.metalness =
              Math.min(
                material.metalness ?? 0,
                0.25
              );

            material.roughness =
              Math.max(
                material.roughness ?? 0.8,
                0.5
              );
          }

          material.needsUpdate =
            true;
        }
      );

    }
  );


  // ------------------------------------------------------------
  // Person 3 Z-UP -> Three.js Y-UP
  // ------------------------------------------------------------

  if (
    SOURCE_UP_AXIS === "z"
  ) {

    root.rotation.x =
      -Math.PI / 2;
  }

  root.updateMatrixWorld(true);


  // ------------------------------------------------------------
  // Center model
  // ------------------------------------------------------------

  const box =
    new THREE.Box3()
      .setFromObject(root);

  const center =
    box.getCenter(
      new THREE.Vector3()
    );

  root.position.x -=
    center.x;

  root.position.z -=
    center.z;

  root.position.y -=
    box.min.y;

  root.updateMatrixWorld(true);


  // ------------------------------------------------------------
  // Final dimensions
  // ------------------------------------------------------------

  const finalBox =
    new THREE.Box3()
      .setFromObject(root);

  const size =
    finalBox.getSize(
      new THREE.Vector3()
    );

  const finalCenter =
    finalBox.getCenter(
      new THREE.Vector3()
    );


  // ------------------------------------------------------------
  // Vertex count
  // ------------------------------------------------------------

  let vertexCount = 0;

  root.traverse(
    (object) => {

      if (
        object.isMesh &&
        object.geometry?.attributes?.position
      ) {

        vertexCount +=
          object.geometry
            .attributes
            .position
            .count;
      }

    }
  );


  return {
    size,
    center: finalCenter,
    vertexCount,
  };
}


// ============================================================================
// FRAME MODEL
// ============================================================================

function frameModel(model) {

  if (!model) {
    return;
  }

  const {
    size,
    center,
  } = model;


  const radius =
    Math.max(
      size.length() / 2,
      10
    );


  const fov =
    THREE.MathUtils.degToRad(
      camera.fov
    );


  const distance =
    (radius /
      Math.sin(fov / 2)) *
    1.25;


  const direction =
    new THREE.Vector3(
      1,
      0.7,
      1
    ).normalize();


  camera.position.copy(
    center
  );

  camera.position.addScaledVector(
    direction,
    distance
  );


  camera.near =
    Math.max(
      distance / 1000,
      0.05
    );

  camera.far =
    Math.max(
      distance * 10,
      10000
    );

  camera.updateProjectionMatrix();


  controls.target.copy(
    center
  );

  controls.minDistance =
    Math.max(
      size.length() * 0.005,
      1
    );

  controls.maxDistance =
    Math.max(
      distance * 8,
      5000
    );

  controls.update();


  sun.target.position.copy(
    center
  );

  sun.target.updateMatrixWorld();

  fill.target.position.copy(
    center
  );

  fill.target.updateMatrixWorld();


  applySolarPosition();

  clearCameraPresetActive();
}


// ============================================================================
// CAMERA PRESET ACTIVE
// ============================================================================

function clearCameraPresetActive() {

  [
    btnCameraTop,
    btnCameraIso,
    btnCameraProfile,
    btnCameraResetPreset,
  ].forEach(
    (btn) =>
      btn?.classList.remove(
        "is-active"
      )
  );
}


// ============================================================================
// CAMERA PRESETS
// ============================================================================

function applyCameraPreset(
  kind,
  button
) {

  if (!activeModel) {

    setStatus(
      "Load a terrain before selecting a camera preset.",
      true
    );

    return;
  }


  stopFlythrough(false);
  setAutoRotate(false);

  controls.enabled = true;


  const {
    size,
    center,
  } = activeModel;


  const radius =
    Math.max(
      size.length() / 2,
      10
    );


  const fov =
    THREE.MathUtils.degToRad(
      camera.fov
    );


  const distance =
    (radius /
      Math.sin(fov / 2)) *
    1.3;


  let direction;


  if (kind === "top") {

    direction =
      new THREE.Vector3(
        0.001,
        1,
        0.001
      ).normalize();

  }

  else if (kind === "iso") {

    direction =
      new THREE.Vector3(
        1,
        0.9,
        1
      ).normalize();

  }

  else if (kind === "profile") {

    direction =
      new THREE.Vector3(
        1,
        0.12,
        0
      ).normalize();

  }

  else {

    direction =
      new THREE.Vector3(
        1,
        0.7,
        1
      ).normalize();

  }


  camera.position.copy(
    center
  );

  camera.position.addScaledVector(
    direction,
    distance
  );


  camera.near =
    Math.max(
      distance / 1000,
      0.05
    );

  camera.far =
    Math.max(
      distance * 10,
      10000
    );

  camera.updateProjectionMatrix();


  controls.target.copy(
    center
  );

  controls.update();


  clearCameraPresetActive();

  button?.classList.add(
    "is-active"
  );


  setStatus(
    `Camera preset: ${kind}`
  );
}


btnCameraTop?.addEventListener(
  "click",
  () =>
    applyCameraPreset(
      "top",
      btnCameraTop
    )
);


btnCameraIso?.addEventListener(
  "click",
  () =>
    applyCameraPreset(
      "iso",
      btnCameraIso
    )
);


btnCameraProfile?.addEventListener(
  "click",
  () =>
    applyCameraPreset(
      "profile",
      btnCameraProfile
    )
);


btnCameraResetPreset?.addEventListener(
  "click",
  resetCamera
);


// ============================================================================
// DISPOSE MODEL
// ============================================================================

function disposeModel(model) {

  if (!model?.root) {
    return;
  }


  model.root.traverse(
    (object) => {

      if (!object.isMesh) {
        return;
      }


      if (object.geometry) {
        object.geometry.dispose();
      }


      const materials =
        Array.isArray(object.material)
          ? object.material
          : [object.material];


      materials.forEach(
        (material) => {

          if (!material) {
            return;
          }


          // Dispose textures.
          [
            "map",
            "normalMap",
            "roughnessMap",
            "metalnessMap",
            "aoMap",
            "emissiveMap",
            "alphaMap",
            "bumpMap",
          ].forEach(
            (key) => {

              if (
                material[key] &&
                material[key].isTexture
              ) {

                material[key].dispose();
              }

            }
          );


          material.dispose();
        }
      );

    }
  );


  scene.remove(
    model.root
  );
}


// ============================================================================
// LOAD GLB FROM URL
// ============================================================================

function loadGLBFromURL(
  url,
  label = "Terrain Model",
  revokeURL = false
) {

  return new Promise(
    (resolve, reject) => {

      if (!url) {

        setStatus(
          "No GLB file selected.",
          true
        );

        reject(
          new Error("No GLB URL")
        );

        return;
      }


      showLoading(
        "SASA MINE",
        `Loading ${label}...`
      );


      setStatusBusy(
        "Loading terrain model..."
      );


      setRowStatus(
        statusIndicatorModelEl,
        statusValueModelEl,
        "Loading...",
        "busy"
      );


      stopFlythrough(false);


      loader.load(

        url,


        // ======================================================
        // SUCCESS
        // ======================================================

        (gltf) => {

          try {

            const root =
              gltf.scene;


            if (!root) {

              throw new Error(
                "GLB scene is empty."
              );
            }


            // Remove previous model FIRST.
            const oldModel =
              activeModel;


            if (oldModel) {

              disposeModel(
                oldModel
              );

              activeModel =
                null;
            }


            // Add new model.
            scene.add(root);


            const measurements =
              prepareModel(
                root
              );


            activeModel = {

              root,

              size:
                measurements.size,

              center:
                measurements.center,

              vertexCount:
                measurements.vertexCount,

              meshRows:
                DEFAULT_MESH_ROWS,

              meshCols:
                DEFAULT_MESH_COLS,

              gridRows:
                terrainData?.rows ??
                GRID_ROWS,

              gridCols:
                terrainData?.cols ??
                GRID_COLS,

              samplingStep:
                DEFAULT_GRID_STEP,
            };


            // ------------------------------------------------
            // Apply existing display states
            // ------------------------------------------------

            applyWireframeState();

            applySlopeHeatmapState();

            applyZExaggeration();


            // ------------------------------------------------
            // Camera
            // ------------------------------------------------

            frameModel(
              activeModel
            );


            clearInspection();

            hideLoading();


            // ------------------------------------------------
            // Status
            // ------------------------------------------------

            setRowStatus(
              statusIndicatorModelEl,
              statusValueModelEl,
              label,
              "ok"
            );


            setRowStatus(
              statusIndicatorRenderEl,
              statusValueRenderEl,
              "READY",
              "ok"
            );


            setRowStatus(
              statusIndicatorCameraEl,
              statusValueCameraEl,
              "READY",
              "ok"
            );


            if (
              telemetryModelValueEl
            ) {

              telemetryModelValueEl.textContent =
                label;
            }


            updateModelMetadataPanels(
              label
            );


            setStatus(
              `Model loaded: ${label}`
            );


            if (revokeURL) {
              URL.revokeObjectURL(
                url
              );
            }


            resolve(
              activeModel
            );

          }

          catch (error) {

            console.error(
              "[SASA MINE] Model preparation error:",
              error
            );


            hideLoading();


            setRowStatus(
              statusIndicatorModelEl,
              statusValueModelEl,
              "ERROR",
              "error"
            );


            setStatus(
              "GLB loaded but could not be prepared.",
              true
            );


            if (revokeURL) {
              URL.revokeObjectURL(
                url
              );
            }


            reject(error);
          }
        },


        // ======================================================
        // PROGRESS
        // ======================================================

        (progress) => {

          if (
            progress &&
            progress.total > 0
          ) {

            updateLoadingProgress(
              (
                progress.loaded /
                progress.total
              ) * 100
            );
          }
        },


        // ======================================================
        // ERROR
        // ======================================================

        (error) => {

          console.error(
            "[SASA MINE] GLB ERROR:",
            error
          );


          hideLoading();


          setRowStatus(
            statusIndicatorModelEl,
            statusValueModelEl,
            "ERROR",
            "error"
          );


          setStatus(
            "Could not load this GLB file. Check the browser console.",
            true
          );


          if (revokeURL) {
            URL.revokeObjectURL(
              url
            );
          }


          reject(error);
        }
      );

    }
  );
}


// ============================================================================
// LOAD GLB FROM FILE
// ============================================================================

function loadGLBFromFile(file) {

  if (!file) {
    return;
  }


  const filename =
    file.name.toLowerCase();


  if (
    !filename.endsWith(".glb") &&
    !filename.endsWith(".gltf")
  ) {

    setStatus(
      "Please select a .glb or .gltf file.",
      true
    );

    return;
  }


  setStatus(
    `Selected: ${file.name}`
  );


  const objectURL =
    URL.createObjectURL(
      file
    );


  loadGLBFromURL(
    objectURL,
    file.name,
    true
  ).catch(
    () => { }
  );
}


// ============================================================================
// MODEL METADATA
// ============================================================================

function updateModelMetadataPanels(
  label
) {

  if (metadataDatasetEl) {

    metadataDatasetEl.textContent =
      label;
  }


  if (
    metadataMeshEl &&
    activeModel
  ) {

    metadataMeshEl.textContent =
      `${activeModel.vertexCount.toLocaleString()} vertices`;
  }


  if (
    viewportMeshEl &&
    activeModel
  ) {

    viewportMeshEl.textContent =
      `${activeModel.vertexCount.toLocaleString()} verts`;
  }


  if (viewportGeorefEl) {

    viewportGeorefEl.textContent =
      "Relative";
  }


  if (metadataResolutionEl) {

    metadataResolutionEl.textContent =
      "Unknown";
  }


  updateElevationPanels();
}


// ============================================================================
// ELEVATION PANELS
// ============================================================================

function updateElevationPanels() {

  if (!activeModel) {
    return;
  }


  let peak;
  let base;


  if (
    gridLoaded &&
    terrainData?.elevation
  ) {

    const range =
      scanGridRange(
        terrainData.elevation
      );


    if (range) {

      peak = range.max;
      base = range.min;
    }
  }


  // If grid isn't loaded, use model dimensions.
  if (
    peak === undefined ||
    base === undefined
  ) {

    peak =
      activeModel.size.y;

    base = 0;
  }


  const relief =
    peak - base;


  if (elevationPeakEl) {

    elevationPeakEl.textContent =
      formatValue(
        peak,
        " m"
      );
  }


  if (elevationBaseEl) {

    elevationBaseEl.textContent =
      formatValue(
        base,
        " m"
      );
  }


  if (elevationReliefEl) {

    elevationReliefEl.textContent =
      formatValue(
        relief,
        " m"
      );
  }


  if (metadataElevationRangeEl) {

    metadataElevationRangeEl.textContent =
      `${formatValue(base, " m")} – ${formatValue(peak, " m")}`;
  }


  drawElevationProfile();
}


// ============================================================================
// SCAN GRID RANGE
// ============================================================================

function scanGridRange(grid) {

  if (!grid) {
    return null;
  }


  let min = Infinity;
  let max = -Infinity;

  let found = false;


  const values =
    Array.isArray(grid) &&
      Array.isArray(grid[0])
      ? grid.flat()
      : grid;


  if (
    !values ||
    typeof values.length !==
    "number"
  ) {

    return null;
  }


  for (
    let i = 0;
    i < values.length;
    i++
  ) {

    const value =
      Number(values[i]);


    if (
      !Number.isFinite(value)
    ) {

      continue;
    }


    found = true;

    min =
      Math.min(
        min,
        value
      );

    max =
      Math.max(
        max,
        value
      );
  }


  if (!found) {
    return null;
  }


  return {
    min,
    max,
  };
}


// ============================================================================
// ELEVATION PROFILE
// ============================================================================

function drawElevationProfile() {

  if (!elevationChartEl) {
    return;
  }


  if (
    !gridLoaded ||
    !terrainData?.elevation
  ) {

    elevationChartEl.innerHTML =
      "";

    return;
  }


  const rows =
    terrainData.rows;

  const cols =
    terrainData.cols;


  const midRow =
    Math.floor(
      rows / 2
    );


  const rowValues = [];


  for (
    let col = 0;
    col < cols;
    col++
  ) {

    const value =
      getGridValue(
        terrainData.elevation,
        midRow,
        col,
        cols
      );


    if (
      typeof value ===
      "number"
    ) {

      rowValues.push(
        value
      );
    }
  }


  if (
    rowValues.length < 2
  ) {

    elevationChartEl.innerHTML =
      "";

    return;
  }


  const width = 300;
  const height = 150;


  const min =
    Math.min(
      ...rowValues
    );

  const max =
    Math.max(
      ...rowValues
    );


  const span =
    max - min || 1;


  const step =
    Math.max(
      1,
      Math.floor(
        rowValues.length /
        120
      )
    );


  const points = [];


  for (
    let i = 0;
    i < rowValues.length;
    i += step
  ) {

    const x =
      (
        i /
        (rowValues.length - 1)
      ) *
      width;


    const y =
      height -
      (
        (
          rowValues[i] -
          min
        ) /
        span
      ) *
      (
        height - 10
      ) -
      5;


    points.push(
      `${x.toFixed(1)},${y.toFixed(1)}`
    );
  }


  elevationChartEl.innerHTML = `
    <svg
      viewBox="0 0 ${width} ${height}"
      width="100%"
      height="100%"
      preserveAspectRatio="none"
    >
      <polyline
        points="${points.join(" ")}"
        fill="none"
        stroke="#5dd8e8"
        stroke-width="1.5"
      />
    </svg>
  `;
}


// ============================================================================
// FORMAT VALUE
// ============================================================================

function formatValue(
  value,
  suffix = ""
) {

  if (
    value === null ||
    value === undefined ||
    Number.isNaN(
      Number(value)
    )
  ) {

    return "---";
  }


  if (
    typeof value ===
    "number" ||
    !Number.isNaN(
      Number(value)
    )
  ) {

    return `${Number(value).toFixed(2)}${suffix}`;
  }


  return `${value}${suffix}`;
}


// ============================================================================
// GRID NORMALIZATION
// ============================================================================

function normalizeGrid(raw) {

  if (!raw || typeof raw !== "object") {

    throw new Error(
      "Grid JSON must contain an object."
    );
  }


  return {

    rows: Number(
      raw.rows ??
      raw.height ??
      GRID_ROWS
    ),

    cols: Number(
      raw.cols ??
      raw.width ??
      GRID_COLS
    ),


    elevation:
      raw.elevation ??
      raw.elevation_grid ??
      raw.elevationGrid ??
      null,


    slope:
      raw.slope ??
      raw.slope_grid ??
      raw.slopeGrid ??
      null,


    terrain:
      raw.terrain ??
      raw.terrain_type ??
      raw.terrain_grid ??
      raw.terrainGrid ??
      null,


    confidence:
      raw.confidence ??
      raw.confidence_grid ??
      raw.confidenceGrid ??
      null,


    before:
      raw.before ??
      raw.before_elevation ??
      raw.before_grid ??
      null,


    during:
      raw.during ??
      raw.during_elevation ??
      raw.during_grid ??
      null,


    change:
      raw.change ??
      raw.elevation_change ??
      raw.difference ??
      raw.difference_grid ??
      raw.differenceGrid ??
      null,
  };
}


// ============================================================================
// LOAD GRID OBJECT
// ============================================================================

function loadGridObject(raw) {

  try {

    terrainData =
      normalizeGrid(
        raw
      );


    gridLoaded = true;

    slopeRange = null;


    if (activeModel) {

      activeModel.gridRows =
        terrainData.rows;

      activeModel.gridCols =
        terrainData.cols;
    }


    setRowStatus(
      statusIndicatorGridEl,
      statusValueGridEl,
      `${terrainData.rows} × ${terrainData.cols}`,
      "ok"
    );


    if (metadataGridEl) {

      metadataGridEl.textContent =
        `${terrainData.rows} × ${terrainData.cols}`;
    }


    if (viewportGridEl) {

      viewportGridEl.textContent =
        `${terrainData.rows} × ${terrainData.cols}`;
    }


    updateElevationPanels();


    setStatus(
      `Grid loaded: ${terrainData.rows} × ${terrainData.cols}`
    );

  }

  catch (error) {

    console.error(
      "[SASA MINE] Grid error:",
      error
    );


    gridLoaded = false;

    terrainData = null;


    setRowStatus(
      statusIndicatorGridEl,
      statusValueGridEl,
      "ERROR",
      "error"
    );


    setStatus(
      "Invalid grid data.",
      true
    );
  }
}


// ============================================================================
// LOAD GRID FILE
// ============================================================================

function loadGridFile(file) {

  if (!file) {
    return;
  }


  if (
    !file.name
      .toLowerCase()
      .endsWith(".json")
  ) {

    setStatus(
      "Please select a JSON grid file.",
      true
    );

    return;
  }


  const reader =
    new FileReader();


  reader.onload = () => {

    try {

      const data =
        JSON.parse(
          reader.result
        );

      loadGridObject(
        data
      );

    }

    catch (error) {

      console.error(
        error
      );

      setStatus(
        "Grid JSON could not be read.",
        true
      );
    }
  };


  reader.onerror = () => {

    setStatus(
      "Could not read the grid file.",
      true
    );
  };


  reader.readAsText(
    file
  );
}


// ============================================================================
// GET GRID VALUE
// ============================================================================

function getGridValue(
  grid,
  row,
  col,
  cols
) {

  if (
    grid === null ||
    grid === undefined
  ) {

    return null;
  }


  // 2D array
  if (
    Array.isArray(grid) &&
    Array.isArray(grid[row])
  ) {

    const value =
      grid[row][col];

    return value ??
      null;
  }


  // Flat array
  if (
    Array.isArray(grid) ||
    ArrayBuffer.isView(grid)
  ) {

    const index =
      row * cols +
      col;

    const value =
      grid[index];

    return value ??
      null;
  }


  return null;
}


// ============================================================================
// GET DATA AT GRID LOCATION
// ============================================================================

function getTerrainDataAt(
  row,
  col
) {

  if (
    !terrainData ||
    !gridLoaded
  ) {

    return {};
  }


  const cols =
    terrainData.cols;


  return {

    elevation:
      getGridValue(
        terrainData.elevation,
        row,
        col,
        cols
      ),

    slope:
      getGridValue(
        terrainData.slope,
        row,
        col,
        cols
      ),

    terrain:
      getGridValue(
        terrainData.terrain,
        row,
        col,
        cols
      ),

    confidence:
      getGridValue(
        terrainData.confidence,
        row,
        col,
        cols
      ),

    before:
      getGridValue(
        terrainData.before,
        row,
        col,
        cols
      ),

    during:
      getGridValue(
        terrainData.during,
        row,
        col,
        cols
      ),

    change:
      getGridValue(
        terrainData.change,
        row,
        col,
        cols
      ),
  };
}


// ============================================================================
// WORLD -> PERSON 2 GRID
// ============================================================================

function worldToGrid(
  worldPoint
) {

  if (!activeModel) {
    return null;
  }


  const local =
    worldPoint.clone();


  // Undo root translation + rotation.
  activeModel.root.worldToLocal(
    local
  );


  const meshCols =
    activeModel.meshCols ||
    DEFAULT_MESH_COLS;

  const meshRows =
    activeModel.meshRows ||
    DEFAULT_MESH_ROWS;

  const step =
    activeModel.samplingStep ||
    DEFAULT_GRID_STEP;


  // Person 3 coordinate convention:
  //
  // X = column
  // Y = -row
  // Z = elevation
  //
  // After root rotation:
  // local coordinates are recovered here.


  const meshColFloat =
    local.x +
    (meshCols - 1) / 2;


  const meshRowFloat =
    -local.y +
    (meshRows - 1) / 2;


  const meshCol =
    Math.round(
      meshColFloat
    );


  const meshRow =
    Math.round(
      meshRowFloat
    );


  if (
    meshRow < 0 ||
    meshRow >= meshRows ||
    meshCol < 0 ||
    meshCol >= meshCols
  ) {

    return null;
  }


  const row =
    meshRow * step;

  const col =
    meshCol * step;


  const gridRows =
    activeModel.gridRows ||
    GRID_ROWS;

  const gridCols =
    activeModel.gridCols ||
    GRID_COLS;


  if (
    row < 0 ||
    row >= gridRows ||
    col < 0 ||
    col >= gridCols
  ) {

    return null;
  }


  return {

    row,
    col,

    meshRow,
    meshCol,
  };
}


// ============================================================================
// RAYCASTER
// ============================================================================

const raycaster =
  new THREE.Raycaster();

const pointer =
  new THREE.Vector2();

let pointerDown = null;


// ============================================================================
// POINTER -> NDC
// ============================================================================

function pointerToNDC(
  event
) {

  const rect =
    renderer.domElement
      .getBoundingClientRect();


  pointer.x =
    (
      (
        event.clientX -
        rect.left
      ) /
      rect.width
    ) *
    2 -
    1;


  pointer.y =
    -(
      (
        event.clientY -
        rect.top
      ) /
      rect.height
    ) *
    2 +
    1;
}


// ============================================================================
// POINTER DOWN
// ============================================================================

renderer.domElement.addEventListener(
  "pointerdown",
  (event) => {

    pointerDown = {

      x:
        event.clientX,

      y:
        event.clientY,
    };
  }
);


// ============================================================================
// POINTER UP = CLICK
// ============================================================================

renderer.domElement.addEventListener(
  "pointerup",
  (event) => {

    if (!pointerDown) {
      return;
    }


    const dx =
      event.clientX -
      pointerDown.x;


    const dy =
      event.clientY -
      pointerDown.y;


    const distance =
      Math.sqrt(
        dx * dx +
        dy * dy
      );


    pointerDown = null;


    // Ignore orbit dragging.
    if (distance > 8) {
      return;
    }


    inspectTerrain(
      event
    );
  }
);


// ============================================================================
// POINTER MOVE
// ============================================================================

renderer.domElement.addEventListener(
  "pointermove",
  (event) => {

    if (
      !activeModel ||
      !viewportCursorAltEl
    ) {

      return;
    }


    pointerToNDC(
      event
    );


    raycaster.setFromCamera(
      pointer,
      camera
    );


    const hits =
      raycaster.intersectObject(
        activeModel.root,
        true
      );


    if (!hits.length) {

      viewportCursorAltEl.textContent =
        "---";

      return;
    }


    const worldPoint =
      hits[0].point;


    const index =
      worldToGrid(
        worldPoint
      );


    if (index) {

      const data =
        getTerrainDataAt(
          index.row,
          index.col
        );


      if (
        typeof data.elevation ===
        "number"
      ) {

        viewportCursorAltEl.textContent =
          formatValue(
            data.elevation,
            " m"
          );

      }

      else {

        viewportCursorAltEl.textContent =
          formatValue(
            worldPoint.y,
            " rel"
          );
      }

    }

    else {

      viewportCursorAltEl.textContent =
        formatValue(
          worldPoint.y,
          " rel"
        );
    }
  }
);


// ============================================================================
// TERRAIN INSPECTION
// ============================================================================

function inspectTerrain(
  event
) {

  if (!activeModel) {

    setStatus(
      "Load a GLB before inspecting terrain.",
      true
    );

    return;
  }


  pointerToNDC(
    event
  );


  raycaster.setFromCamera(
    pointer,
    camera
  );


  const hits =
    raycaster.intersectObject(
      activeModel.root,
      true
    );


  if (!hits.length) {
    return;
  }


  const worldPoint =
    hits[0].point.clone();


  const index =
    worldToGrid(
      worldPoint
    );


  placeMarker(
    worldPoint
  );


  if (!index) {

    showInspection({

      message:
        "3D point detected, but grid mapping was unavailable.",
    });

    return;
  }


  const data =
    getTerrainDataAt(
      index.row,
      index.col
    );


  showInspection({

    ...index,

    ...data,
  });


  console.log(
    "[SASA MINE] TERRAIN INSPECTION",
    {
      index,
      data,
    }
  );
}


// ============================================================================
// SHOW INSPECTION
// ============================================================================

function showInspection(
  data
) {

  if (!inspectionPanelEl) {
    return;
  }


  inspectionPanelEl.classList.add(
    "has-selection"
  );


  const set =
    (
      element,
      text
    ) => {

      if (element) {
        element.textContent =
          text;
      }
    };


  set(
    inspectionRowEl,
    data.row !== undefined
      ? String(data.row)
      : "---"
  );


  set(
    inspectionColEl,
    data.col !== undefined
      ? String(data.col)
      : "---"
  );


  set(
    inspectionElevationEl,
    formatValue(
      data.elevation,
      " m"
    )
  );


  set(
    inspectionSlopeEl,
    formatValue(
      data.slope,
      "°"
    )
  );


  set(
    inspectionTerrainTypeEl,
    data.terrain ??
    "---"
  );


  set(
    inspectionConfidenceEl,
    formatValue(
      data.confidence
    )
  );


  set(
    inspectionChangeEl,
    formatValue(
      data.change,
      " m"
    )
  );


  set(
    inspectionBeforeEl,
    formatValue(
      data.before,
      " m"
    )
  );


  set(
    inspectionDuringEl,
    formatValue(
      data.during,
      " m"
    )
  );


  if (data.message) {

    setStatus(
      data.message
    );

  }

  else if (!gridLoaded) {

    setStatus(
      "3D point detected. Load Person 2 grid JSON for terrain analytics."
    );

  }

  else {

    setStatus(
      `Grid point selected: row ${data.row}, col ${data.col}`
    );
  }
}


// ============================================================================
// CLEAR INSPECTION
// ============================================================================

function clearInspection() {

  inspectionPanelEl?.classList.remove(
    "has-selection"
  );

  markerWorldPoint =
    null;

  terrainMarkerEl?.classList.remove(
    "is-visible"
  );
}


// ============================================================================
// SCREEN MARKER
// ============================================================================

function placeMarker(
  worldPoint
) {

  markerWorldPoint =
    worldPoint.clone();

  updateMarkerScreenPosition();
}


function updateMarkerScreenPosition() {

  if (
    !terrainMarkerEl ||
    !markerWorldPoint
  ) {

    return;
  }


  const projected =
    markerWorldPoint
      .clone()
      .project(camera);


  if (
    projected.z > 1 ||
    projected.z < -1
  ) {

    terrainMarkerEl.classList.remove(
      "is-visible"
    );

    return;
  }


  const rect =
    renderer.domElement
      .getBoundingClientRect();


  const x =
    (
      projected.x *
      0.5 +
      0.5
    ) *
    rect.width +
    rect.left;


  const y =
    (
      -projected.y *
      0.5 +
      0.5
    ) *
    rect.height +
    rect.top;


  terrainMarkerEl.style.left =
    `${x}px`;

  terrainMarkerEl.style.top =
    `${y}px`;


  terrainMarkerEl.classList.add(
    "is-visible"
  );
}


// ============================================================================
// MATERIAL HELPERS
// ============================================================================

function forEachMeshMaterial(
  callback
) {

  if (!activeModel) {
    return;
  }


  activeModel.root.traverse(
    (object) => {

      if (!object.isMesh) {
        return;
      }


      const materials =
        Array.isArray(
          object.material
        )
          ? object.material
          : [object.material];


      materials.forEach(
        (material) => {

          if (material) {

            callback(
              material,
              object
            );
          }

        }
      );
    }
  );
}


// ============================================================================
// WIREFRAME
// ============================================================================

function applyWireframeState() {

  forEachMeshMaterial(
    (material) => {

      material.wireframe =
        wireframeOn;

      material.needsUpdate =
        true;
    }
  );
}


function setWireframe(
  on
) {

  wireframeOn = on;

  applyWireframeState();

  setStatus(
    on
      ? "Wireframe enabled"
      : "Wireframe disabled"
  );
}


// ============================================================================
// HILLSHADE
// ============================================================================

function setHillshade(
  on
) {

  hillshadeOn = on;


  const values =
    on
      ? LIGHT_HILLSHADE
      : LIGHT_BASE;


  ambient.intensity =
    values.ambient;

  hemisphere.intensity =
    values.hemisphere;

  sun.intensity =
    values.sun;


  setStatus(
    on
      ? "Hillshade enabled"
      : "Hillshade disabled"
  );
}


// ============================================================================
// SLOPE RANGE
// ============================================================================

function computeSlopeRange() {

  if (slopeRange) {
    return slopeRange;
  }


  if (!terrainData?.slope) {
    return null;
  }


  slopeRange =
    scanGridRange(
      terrainData.slope
    );


  return slopeRange;
}


// ============================================================================
// SLOPE HEATMAP
// ============================================================================

function applySlopeHeatmapState() {

  if (!activeModel) {
    return;
  }


  if (!slopeHeatmapOn) {

    forEachMeshMaterial(
      (material) => {

        material.vertexColors =
          false;

        material.needsUpdate =
          true;
      }
    );

    return;
  }


  const range =
    computeSlopeRange();


  if (!range) {

    slopeHeatmapOn =
      false;


    [
      btnSlopeHeatmap,
      btnToolbarSlopeHeatmap,
    ].forEach(
      (button) =>
        button?.classList.remove(
          "is-active"
        )
    );


    setStatus(
      "Slope data unavailable.",
      true
    );

    return;
  }


  const span =
    range.max -
    range.min ||
    1;


  activeModel.root.traverse(
    (object) => {

      if (
        !object.isMesh ||
        !object.geometry?.attributes
          ?.position
      ) {

        return;
      }


      const geometry =
        object.geometry;


      const positions =
        geometry.attributes.position;


      const colors =
        new Float32Array(
          positions.count * 3
        );


      const color =
        new THREE.Color();


      for (
        let i = 0;
        i < positions.count;
        i++
      ) {

        const x =
          positions.getX(i);

        const y =
          positions.getY(i);


        const meshCol =
          Math.round(
            x +
            (
              activeModel.meshCols -
              1
            ) /
            2
          );


        const meshRow =
          Math.round(
            -y +
            (
              activeModel.meshRows -
              1
            ) /
            2
          );


        let value =
          null;


        if (
          meshRow >= 0 &&
          meshRow <
          activeModel.meshRows &&
          meshCol >= 0 &&
          meshCol <
          activeModel.meshCols
        ) {

          const row =
            meshRow *
            activeModel.samplingStep;

          const col =
            meshCol *
            activeModel.samplingStep;


          value =
            getGridValue(
              terrainData.slope,
              row,
              col,
              terrainData.cols
            );
        }


        if (
          typeof value ===
          "number"
        ) {

          const t =
            Math.min(
              Math.max(
                (
                  value -
                  range.min
                ) /
                span,
                0
              ),
              1
            );


          // Blue -> cyan -> yellow -> red
          color.setHSL(
            0.62 -
            t * 0.62,
            0.75,
            0.5
          );

        }

        else {

          color.setRGB(
            0.35,
            0.37,
            0.4
          );
        }


        colors[i * 3] =
          color.r;

        colors[i * 3 + 1] =
          color.g;

        colors[i * 3 + 2] =
          color.b;
      }


      geometry.setAttribute(
        "color",
        new THREE.BufferAttribute(
          colors,
          3
        )
      );


      const materials =
        Array.isArray(
          object.material
        )
          ? object.material
          : [object.material];


      materials.forEach(
        (material) => {

          if (!material) {
            return;
          }


          material.vertexColors =
            true;

          material.needsUpdate =
            true;
        }
      );

    }
  );


  setStatus(
    "Slope heatmap enabled"
  );
}


function setSlopeHeatmap(
  on
) {

  slopeHeatmapOn =
    on;

  applySlopeHeatmapState();
}


// ============================================================================
// LINKED TOGGLES
// ============================================================================

function wireLinkedToggle(
  buttons,
  callback,
  guard
) {

  const valid =
    buttons.filter(Boolean);


  if (!valid.length) {
    return;
  }


  valid.forEach(
    (button) => {

      button.addEventListener(
        "click",
        () => {

          const currentlyOn =
            valid[0].classList.contains(
              "is-active"
            );


          const nextState =
            !currentlyOn;


          if (
            guard &&
            guard(nextState) === false
          ) {

            return;
          }


          valid.forEach(
            (b) =>
              b.classList.toggle(
                "is-active",
                nextState
              )
          );


          callback(
            nextState
          );
        }
      );
    }
  );
}


// ============================================================================
// SHADING BUTTONS
// ============================================================================

wireLinkedToggle(
  [
    btnWireframe,
    btnToolbarWireframe,
  ],
  setWireframe
);


wireLinkedToggle(
  [
    btnHillshade,
    btnToolbarHillshade,
  ],
  setHillshade
);


wireLinkedToggle(
  [
    btnSlopeHeatmap,
    btnToolbarSlopeHeatmap,
  ],
  setSlopeHeatmap,
  (turningOn) => {

    if (
      turningOn &&
      (
        !gridLoaded ||
        !terrainData?.slope
      )
    ) {

      setStatus(
        "Load grid data containing slope values first.",
        true
      );

      return false;
    }


    return true;
  }
);


// ============================================================================
// TERRAIN TEXTURE / RESET SHADING
// ============================================================================

function resetShading() {

  wireframeOn = false;
  hillshadeOn = false;
  slopeHeatmapOn = false;


  applyWireframeState();

  setHillshade(false);

  applySlopeHeatmapState();


  [
    btnWireframe,
    btnToolbarWireframe,
    btnHillshade,
    btnToolbarHillshade,
    btnSlopeHeatmap,
    btnToolbarSlopeHeatmap,
  ].forEach(
    (button) =>
      button?.classList.remove(
        "is-active"
      )
  );


  setStatus(
    "Terrain appearance reset"
  );
}


btnTerrainTexture?.addEventListener(
  "click",
  resetShading
);


// ============================================================================
// SLIDER FILL
// ============================================================================

function updateSliderFill(
  element
) {

  if (!element) {
    return;
  }


  const min =
    Number(element.min) || 0;

  const max =
    Number(element.max) || 100;


  const value =
    Number(element.value);


  const percentage =
    (
      (
        value - min
      ) /
      (
        max - min
      )
    ) *
    100;


  element.style.setProperty(
    "--range-progress",
    `${percentage}%`
  );
}


// ============================================================================
// Z EXAGGERATION
// ============================================================================

function applyZExaggeration() {

  if (!activeModel) {
    return;
  }


  // IMPORTANT:
  // Person 3 elevation axis is authored Z.
  // Therefore scale local Z before/through the Z-up -> Y-up rotation.
  activeModel.root.scale.z =
    zExaggeration;


  activeModel.root.updateMatrixWorld(
    true
  );


  // Recalculate model measurements after scaling.
  const box =
    new THREE.Box3()
      .setFromObject(
        activeModel.root
      );


  activeModel.size =
    box.getSize(
      new THREE.Vector3()
    );

  activeModel.center =
    box.getCenter(
      new THREE.Vector3()
    );


  sun.target.position.copy(
    activeModel.center
  );

  sun.target.updateMatrixWorld();

  applySolarPosition();
}


// ============================================================================
// SOLAR AZIMUTH
// ============================================================================

solarAzimuthEl?.addEventListener(
  "input",
  () => {

    solarAzimuthDeg =
      Number(
        solarAzimuthEl.value
      );


    if (
      solarAzimuthValueEl
    ) {

      solarAzimuthValueEl.textContent =
        `${Math.round(
          solarAzimuthDeg
        )}°`;
    }


    updateSliderFill(
      solarAzimuthEl
    );


    applySolarPosition();
  }
);


// ============================================================================
// SOLAR ELEVATION
// ============================================================================

solarElevationEl?.addEventListener(
  "input",
  () => {

    solarElevationDeg =
      Number(
        solarElevationEl.value
      );


    if (
      solarElevationValueEl
    ) {

      solarElevationValueEl.textContent =
        `${Math.round(
          solarElevationDeg
        )}°`;
    }


    updateSliderFill(
      solarElevationEl
    );


    applySolarPosition();
  }
);


// ============================================================================
// Z EXAGGERATION SLIDER
// ============================================================================

zExaggerationEl?.addEventListener(
  "input",
  () => {

    zExaggeration =
      Number(
        zExaggerationEl.value
      );


    if (
      zExaggerationValueEl
    ) {

      zExaggerationValueEl.textContent =
        `${zExaggeration.toFixed(
          1
        )}x`;
    }


    updateSliderFill(
      zExaggerationEl
    );


    applyZExaggeration();
  }
);


updateSliderFill(
  solarAzimuthEl
);

updateSliderFill(
  solarElevationEl
);

updateSliderFill(
  zExaggerationEl
);


// ============================================================================
// FLYTHROUGH PATH
// ============================================================================

function createFlyPath(
  model
) {

  const {
    size,
    center,
  } = model;


  const width =
    Math.max(
      size.x,
      size.z
    );


  const height =
    Math.max(
      size.y,
      width * 0.12,
      20
    );


  const points = [

    // High starting shot
    new THREE.Vector3(
      center.x +
      width * 0.95,

      center.y +
      height * 1.8,

      center.z +
      width * 0.95
    ),

    // Descend
    new THREE.Vector3(
      center.x +
      width * 0.6,

      center.y +
      height * 1.15,

      center.z +
      width * 0.35
    ),

    // Move toward terrain
    new THREE.Vector3(
      center.x +
      width * 0.3,

      center.y +
      height * 0.7,

      center.z
    ),

    // Low cinematic pass
    new THREE.Vector3(
      center.x,

      center.y +
      height * 0.45,

      center.z -
      width * 0.15
    ),

    // Across terrain
    new THREE.Vector3(
      center.x -
      width * 0.45,

      center.y +
      height * 0.3,

      center.z -
      width * 0.25
    ),

    // Final rising shot
    new THREE.Vector3(
      center.x -
      width * 0.25,

      center.y +
      height * 0.45,

      center.z +
      width * 0.35
    ),
  ];


  return new THREE.CatmullRomCurve3(
    points,
    false,
    "catmullrom",
    0.5
  );
}


// ============================================================================
// START FLYTHROUGH
// ============================================================================

function startFlythrough() {

  if (!activeModel) {

    setStatus(
      "Load a GLB before starting flythrough.",
      true
    );

    return;
  }


  setAutoRotate(false);


  flyPath =
    createFlyPath(
      activeModel
    );


  flying = true;


  flyClock.start();


  controls.enabled =
    false;


  btnFlythroughStart?.classList.add(
    "is-active"
  );


  btnFlythroughStop?.classList.remove(
    "is-active"
  );


  setRowStatus(
    statusIndicatorCameraEl,
    statusValueCameraEl,
    "FLYTHROUGH",
    "busy"
  );


  setStatus(
    "Flythrough running..."
  );
}


// ============================================================================
// STOP FLYTHROUGH
// ============================================================================

function stopFlythrough(
  showMessage = true
) {

  flying = false;

  flyClock.stop();

  controls.enabled = true;


  btnFlythroughStart?.classList.remove(
    "is-active"
  );


  if (showMessage) {

    btnFlythroughStop?.classList.add(
      "is-active"
    );


    setRowStatus(
      statusIndicatorCameraEl,
      statusValueCameraEl,
      "READY",
      "ok"
    );


    setStatus(
      "Manual navigation"
    );
  }
}


// ============================================================================
// EASING
// ============================================================================

function easeInOut(t) {

  return t < 0.5

    ? 2 * t * t

    : 1 -
    Math.pow(
      -2 * t + 2,
      2
    ) /
    2;
}


// ============================================================================
// UPDATE FLYTHROUGH
// ============================================================================

function updateFlythrough() {

  if (
    !flying ||
    !flyPath ||
    !activeModel
  ) {

    return;
  }


  const cycle =
    FLY_DURATION * 2;


  const elapsed =
    flyClock.getElapsedTime() %
    cycle;


  const rawT =
    elapsed <=
      FLY_DURATION

      ? elapsed /
      FLY_DURATION

      : 2 -
      elapsed /
      FLY_DURATION;


  const t =
    easeInOut(
      rawT
    );


  const position =
    flyPath.getPointAt(
      t
    );


  camera.position.copy(
    position
  );


  // Look slightly ahead.
  const lookT =
    Math.min(
      t + 0.035,
      1
    );


  const lookPoint =
    flyPath.getPointAt(
      lookT
    );


  const target =
    activeModel.center
      .clone()
      .lerp(
        lookPoint,
        0.4
      );


  camera.lookAt(
    target
  );
}


// ============================================================================
// AUTO ROTATE
// ============================================================================

function setAutoRotate(
  on
) {

  autoRotateOn =
    on;

  controls.autoRotate =
    on;


  btnAutoRotate?.classList.toggle(
    "is-active",
    on
  );
}


btnAutoRotate?.addEventListener(
  "click",
  () => {

    if (!activeModel) {

      setStatus(
        "Load a terrain before enabling auto rotate.",
        true
      );

      return;
    }


    setAutoRotate(
      !autoRotateOn
    );


    setStatus(
      autoRotateOn
        ? "Auto rotate enabled"
        : "Auto rotate disabled"
    );
  }
);


// ============================================================================
// MANUAL NAVIGATION
// ============================================================================

function enableManualNavigation() {

  stopFlythrough(false);

  setAutoRotate(false);

  controls.enabled =
    true;


  setRowStatus(
    statusIndicatorCameraEl,
    statusValueCameraEl,
    "MANUAL",
    "ok"
  );


  setStatus(
    "Manual navigation enabled"
  );
}


btnManualNavigation?.addEventListener(
  "click",
  enableManualNavigation
);


// ============================================================================
// RESET CAMERA
// ============================================================================

function resetCamera() {

  if (!activeModel) {

    setStatus(
      "Load a GLB before resetting camera.",
      true
    );

    return;
  }


  stopFlythrough(false);

  setAutoRotate(false);

  controls.enabled =
    true;


  frameModel(
    activeModel
  );


  setRowStatus(
    statusIndicatorCameraEl,
    statusValueCameraEl,
    "READY",
    "ok"
  );


  setStatus(
    "Camera reset"
  );
}


btnCameraResetBottom?.addEventListener(
  "click",
  resetCamera
);


// ============================================================================
// IMAGE -> BACKEND -> GLB
// ============================================================================

async function processImage(
  file
) {

  if (!file) {
    return;
  }


  setStatus(
    `Selected image: ${file.name}`
  );


  // ------------------------------------------------------------
  // No backend configured
  // ------------------------------------------------------------

  if (!BACKEND_ENDPOINT) {

    setStatus(
      "Image selected. Backend endpoint is not configured yet. Load a GLB directly for the viewer.",
      true
    );

    return;
  }


  try {

    showLoading(
      "PROCESSING IMAGE",
      "Uploading image..."
    );


    setStatusBusy(
      "Uploading image..."
    );


    const form =
      new FormData();


    form.append(
      IMAGE_FIELD_NAME,
      file
    );


    const response =
      await fetch(
        BACKEND_ENDPOINT,
        {
          method: "POST",
          body: form,
        }
      );


    if (!response.ok) {

      throw new Error(
        `Backend HTTP ${response.status}`
      );
    }


    updateLoadingProgress(
      50
    );


    setStatusBusy(
      "Processing terrain..."
    );


    const data =
      await response.json();


    const glbURL =
      data[
      RESPONSE_GLB_URL_FIELD
      ];


    if (!glbURL) {

      throw new Error(
        "Backend response did not contain glbUrl."
      );
    }


    updateLoadingProgress(
      75
    );


    await loadGLBFromURL(
      glbURL,
      "Generated Terrain"
    );


    updateLoadingProgress(
      100
    );


    setStatus(
      "Generated terrain ready"
    );

  }

  catch (error) {

    console.error(
      "[SASA MINE] IMAGE PROCESSING ERROR:",
      error
    );


    hideLoading();


    setStatus(
      "Image processing failed.",
      true
    );
  }
}


// ============================================================================
// BUTTON — LOAD GLB
// ============================================================================

btnLoadGlb?.addEventListener(
  "click",
  () => {

    console.log(
      "[SASA MINE] Load GLB button clicked"
    );

    inputGlb?.click();
  }
);


// ============================================================================
// INPUT — GLB
// ============================================================================

inputGlb?.addEventListener(
  "change",
  (event) => {

    const file =
      event.target.files?.[0];


    if (file) {

      loadGLBFromFile(
        file
      );
    }


    // Allows selecting same file again.
    event.target.value =
      "";
  }
);


// ============================================================================
// BUTTON — UPLOAD IMAGE
// ============================================================================

btnUploadImage?.addEventListener(
  "click",
  () => {

    console.log(
      "[SASA MINE] Upload image button clicked"
    );

    inputImage?.click();
  }
);


// ============================================================================
// INPUT — IMAGE
// ============================================================================

inputImage?.addEventListener(
  "change",
  (event) => {

    const file =
      event.target.files?.[0];


    if (file) {

      processImage(
        file
      );
    }


    event.target.value =
      "";
  }
);


// ============================================================================
// BUTTON — LOAD GRID
// ============================================================================

btnLoadGrid?.addEventListener(
  "click",
  () => {

    console.log(
      "[SASA MINE] Load grid button clicked"
    );

    inputGrid?.click();
  }
);


// ============================================================================
// INPUT — GRID
// ============================================================================

inputGrid?.addEventListener(
  "change",
  (event) => {

    const file =
      event.target.files?.[0];


    if (file) {

      loadGridFile(
        file
      );
    }


    event.target.value =
      "";
  }
);


// ============================================================================
// FLYTHROUGH BUTTONS
// ============================================================================

btnFlythroughStart?.addEventListener(
  "click",
  () => {

    console.log(
      "[SASA MINE] START FLYTHROUGH"
    );

    startFlythrough();
  }
);


btnFlythroughStop?.addEventListener(
  "click",
  () => {

    console.log(
      "[SASA MINE] STOP FLYTHROUGH"
    );

    stopFlythrough();
  }
);


// ============================================================================
// DRAG & DROP GLB
// ============================================================================

renderer.domElement.addEventListener(
  "dragover",
  (event) => {

    event.preventDefault();

    event.dataTransfer.dropEffect =
      "copy";
  }
);


renderer.domElement.addEventListener(
  "drop",
  (event) => {

    event.preventDefault();


    const file =
      event.dataTransfer.files?.[0];


    if (!file) {
      return;
    }


    const name =
      file.name.toLowerCase();


    if (
      name.endsWith(".glb") ||
      name.endsWith(".gltf")
    ) {

      loadGLBFromFile(
        file
      );

    }

    else {

      setStatus(
        "Please drop a .glb or .gltf file.",
        true
      );
    }
  }
);


// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================

window.addEventListener(
  "keydown",
  (event) => {

    // R = reset
    if (
      event.key.toLowerCase() ===
      "r"
    ) {

      resetCamera();
    }


    // SPACE = flythrough
    if (
      event.code ===
      "Space"
    ) {

      event.preventDefault();


      if (flying) {

        stopFlythrough();

      }

      else {

        startFlythrough();
      }
    }


    // ESC = stop / clear
    if (
      event.key ===
      "Escape"
    ) {

      stopFlythrough();

      clearInspection();
    }
  }
);


// ============================================================================
// RESIZE
// ============================================================================

window.addEventListener(
  "resize",
  () => {

    camera.aspect =
      window.innerWidth /
      window.innerHeight;


    camera.updateProjectionMatrix();


    renderer.setSize(
      window.innerWidth,
      window.innerHeight
    );
  }
);


// ============================================================================
// TELEMETRY
// ============================================================================

function updateOrbitTelemetry() {

  if (
    !viewportAzimuthEl &&
    !viewportPitchEl
  ) {

    return;
  }


  const offset =
    camera.position
      .clone()
      .sub(
        controls.target
      );


  const spherical =
    new THREE.Spherical()
      .setFromVector3(
        offset
      );


  if (viewportAzimuthEl) {

    viewportAzimuthEl.textContent =
      `${THREE.MathUtils.radToDeg(
        spherical.theta
      ).toFixed(0)}°`;
  }


  if (viewportPitchEl) {

    const pitch =
      90 -
      THREE.MathUtils.radToDeg(
        spherical.phi
      );


    viewportPitchEl.textContent =
      `${pitch.toFixed(0)}°`;
  }
}


// ============================================================================
// ANIMATION LOOP
// ============================================================================

function animate() {

  requestAnimationFrame(
    animate
  );


  if (flying) {

    updateFlythrough();

  }

  else {

    controls.update();
  }


  updateOrbitTelemetry();

  updateMarkerScreenPosition();


  renderer.render(
    scene,
    camera
  );
}


// ============================================================================
// INITIALIZATION
// ============================================================================

function initialize() {

  hideLoading();


  setRowStatus(
    statusIndicatorModelEl,
    statusValueModelEl,
    "---",
    "idle"
  );


  setRowStatus(
    statusIndicatorGridEl,
    statusValueGridEl,
    "---",
    "idle"
  );


  setRowStatus(
    statusIndicatorRenderEl,
    statusValueRenderEl,
    "READY",
    "ok"
  );


  setRowStatus(
    statusIndicatorCameraEl,
    statusValueCameraEl,
    "---",
    "idle"
  );


  setSystemStatus(
    "READY",
    false,
    false
  );


  if (telemetryModelValueEl) {

    telemetryModelValueEl.textContent =
      "---";
  }


  setStatus(
    "Ready — Load a GLB terrain model"
  );


  console.log(
    "=========================================="
  );

  console.log(
    "SASA MINE 3D TERRAIN VIEWER"
  );

  console.log(
    "Three.js revision:",
    THREE.REVISION
  );

  console.log(
    "Viewer initialized successfully."
  );

  console.log(
    "=========================================="
  );
}


// ============================================================================
// START
// ============================================================================

initialize();

animate();


// ============================================================================
// DEBUG / GLOBAL HOOKS
// ============================================================================

window.loadGLBFromFile =
  loadGLBFromFile;

window.loadGLBFromURL =
  loadGLBFromURL;

window.loadGridFile =
  loadGridFile;

window.loadGridObject =
  loadGridObject;

window.startFlythrough =
  startFlythrough;

window.stopFlythrough =
  stopFlythrough;

window.resetCamera =
  resetCamera;

window.inspectTerrain =
  inspectTerrain;

window.worldToGrid =
  worldToGrid;


console.log(
  "[SASA MINE] main.js successfully loaded."
);