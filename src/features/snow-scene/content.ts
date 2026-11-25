// Text, colours and every tunable number for the snow scene live here,
// not inside components. Distances are in scene units: one unit is the
// height of one character.
export const content = {
  title: "Plop!",
  tagline: "A cute snowy toy: pull back, roll a snowball, let go.",

  resetView: "Reset view",
  lookHint: "Scroll or pinch to rise and dip. Swipe sideways or drag to turn.",

  // TEMPORARY: words for the press test hook. Remove with TempDragPress.
  tempLook: "Look",
  tempPress: "Press",
  tempPressHint: "Press and hold, or drag, on the snow. Double tap for a crater.",

  ground: {
    // The middle of the play area (the characters stand around it).
    centerZ: 0,
    // Snow can be pressed anywhere. Where something presses, square tiles of
    // fine grid are made on the spot: this big (scene units), with grid
    // squares this wide (smaller = finer dents, more work for the phone).
    tileSize: 4,
    cell: 0.05,
    // Tiles further than this from the middle use coarser squares (only seen
    // from high up), and every tile has a short hidden lip hanging down its
    // edges so no gap shows where a fine and a coarse tile meet.
    fineRadius: 12,
    farCell: 0.05,
    skirtDepth: 0.5,
    // How far from the middle pressing works (beyond it the snow is haze),
    // and the most tiles kept, so memory stays bounded.
    pressReach: 60,
    maxTiles: 400,
    // How far down the snow can be pressed before it hits hard ground.
    depth: 0.9,
    // Gentle drifts so the surface is not a flat sheet.
    driftHeight: 0.09,
    driftScale: 0.42,
    // Fine ripples, drawn as shading only.
    rippleHeight: 0.009,
    rippleScale: 2.6,
  },

  // The plain snow everywhere, until something presses it.
  surround: {
    // How far the snow reaches from the middle, in every direction.
    reach: 92,
    // Grid squares of this size out to nearSize from the middle, then
    // growing by this factor per step, up to maxStep.
    nearStep: 0.15,
    nearSize: 12,
    growth: 1.09,
    maxStep: 3,
    // The far grid is too coarse to draw small shapes, so detail hands over
    // with distance from the middle: the small drifts become shading only,
    // while medium drifts and then big mounds take over. Low views get
    // their depth from those.
    driftFadeStart: 6,
    driftFadeEnd: 9.5,
    midStart: 3.5,
    midFull: 7.5,
    midFadeStart: 12,
    midFadeEnd: 16,
    midHeight: 0.2,
    midScale: 0.17,
    moundStart: 9,
    moundFull: 20,
    moundHeight: 0.7,
    moundScale: 0.07,
  },

  // Far away, the snow melts into the soft sky between these distances from the middle.
  haze: {
    start: 44,
    end: 88,
  },

  press: {
    // How deep a ball sinks the first time it touches, as a share of its radius.
    // Pressing longer digs further, down to hard ground.
    sinkPerRadius: 0.3,
    // How steep the walls of a deep pit are (rise per unit sideways).
    wallSlope: 1.7,
    // Share of the pushed-away snow that piles up at the edge (the rest packs down).
    rimShare: 0.55,
    // Rim width as a share of the dent's radius, with an upper limit.
    rimWidth: 0.55,
    rimWidthMax: 0.3,
    // Rim height grows with the depth of the dent, between these limits.
    rimHeightPerDepth: 0.55,
    rimMinHeight: 0.035,
    rimMaxHeight: 0.16,
    // Snow already sunk this deep gets no rim piled on it, so grooves stay clean.
    rimSkipDepth: 0.03,
    // How much the rim is smoothed each time it is touched (0 = sharp, 1 = very soft).
    rimSoften: 0.35,
    // Depth at which pressed snow reaches its full darker, bluer tint.
    fullTintDepth: 0.6,
    // Within this height of hard ground, the hard-ground colour shows through.
    hardGroundBlend: 0.05,
    // Ploughing: how much more snow piles ahead of a moving ball than beside
    // it, how little is left behind it, and the speed at which that is in full effect.
    plough: 0.9,
    ploughBehind: 0.1,
    ploughFullSpeed: 1.2,
  },

  crater: {
    // Crater depth as a share of its radius.
    depthPerRadius: 0.5,
    rimShare: 0.75,
    rimWidth: 0.6,
    rimMaxHeight: 0.14,
    // How lumpy the splash rim is (0 = perfectly even).
    rimLumpiness: 0.6,
  },

  // Snow thrown up when the snow is pressed or hit.
  spray: {
    // Most dust puffs and clumps alive at once.
    dustCount: 500,
    clumpCount: 140,
    // How many are thrown per unit of snow pushed away.
    dustPerVolume: 1500,
    clumpsPerVolume: 260,
    // A crater throws this many times more, and faster.
    burstBoost: 1.6,
    burstSpeed: 2.6,
    // Share thrown when pressing without moving; full amount at fullSpeed.
    stillShare: 0.15,
    fullSpeed: 2.5,
    // Most thrown by one press, so a huge hit cannot empty the pool.
    maxPerKick: 90,
    dustLife: 0.9,
    dustSize: 0.16,
    dustOpacity: 0.5,
    dustRise: 0.9,
    dustDrag: 3.2,
    dustGravity: 0.6,
    clumpSize: 0.02,
    // How much the clumps glow with their own light, so they never look like stones.
    clumpGlow: 0.3,
    // Puffs and clumps grow with the size of the dent that threw them: at
    // this dent radius they are their normal size, at most this many times bigger.
    baseRadius: 0.25,
    maxSizeScale: 4,
    clumpRise: 2.4,
    clumpGravity: 7.5,
    // How long a landed clump stays before it melts into the snow.
    clumpSettle: 0.7,
  },

  colors: {
    // Not pure white: leaves headroom for sun highlights and sparkles.
    snow: "#dfe7f2",
    snowPressed: "#8fabd6",
    // Shows where the snow is pressed right down to the ground.
    hardGround: "#6f86ad",
    sun: "#ffe2bd",
    skyFill: "#a9c8ff",
    groundBounce: "#dfe6f5",
    sparkle: "#fff6e6",
    // The soft sky the far snow melts into: top and bottom of the screen.
    fogTop: "#cfdcf0",
    fogBottom: "#e3eaf5",
    snowflake: "#ffffff",
    snowDust: "#ffffff",
    // TEMPORARY: stand-in blocks shown with ?guides in the address.
    tempGuide: "#e58a6b",
  },

  light: {
    // Sun height above the horizon and its compass direction, in degrees.
    // 0 = shining from the right, 90 = from behind the scene toward the viewer.
    sunElevation: 24,
    sunAzimuth: 128,
    sunStrength: 5,
    skyStrength: 1.7,
    exposure: 1.0,
    // Shadows: sharpness and softness.
    shadowMapSize: 2048,
    shadowSoftness: 5,
    shadowArea: 16,
    shadowBias: -0.0004,
    shadowNormalBias: 0.05,
  },

  surface: {
    // Fine grain: size of the bumps and how strongly they catch the light.
    grainScale: 85,
    grainStrength: 0.13,
    grainTint: 0.03,
    roughness: 0.92,
    // Sparkles: size of one glint, how many light up, how fast they flicker
    // as the view shifts, and how bright they get.
    sparkleCell: 0.02,
    sparkleAmount: 0.022,
    sparkleSensitivity: 900,
    sparkleStrength: 2.2,
  },

  camera: {
    // Starting angle above the ground, in degrees (30 to 40 = snow diorama on a table).
    elevation: 35,
    fieldOfView: 22,
    // A character one unit tall fills this share of the screen height.
    characterScreenShare: 0.2,
    // Height of the point the camera looks at.
    targetHeight: 0.35,
    // A tiny slow drift of the view, so sparkles glint.
    swayAmount: 0.12,
    swaySpeed: 0.22,
  },

  // The camera travels along one path, from a low, close view looking across
  // the snow (characters large) up to a high, far, steep view (everything
  // small). Scrolling, pinching and dragging up/down move along that path;
  // swiping or dragging sideways turns the view around the play area.
  cameraPath: {
    // The low end: angle above the ground (degrees) and distance (as a share
    // of the normal play-view distance).
    lowPitch: 14,
    lowDistance: 0.75,
    // The middle is the normal play view (camera.elevation, both characters
    // in frame). The high end: steep but short of straight down, so upright
    // cut-out scenery never looks flat.
    highPitch: 76,
    highDistance: 5.5,
    // Where the play view sits on the path: 0 = low end, 1 = high end.
    playAt: 0.42,
    // Finer control around the play view: 1 = even all along, smaller =
    // slower near the middle (0.45 means a little under half speed there).
    middleSpeed: 0.45,
    // Over this last share of the path at each end, input slows down, so the
    // view eases into its limits instead of stopping dead.
    endEase: 0.12,
    // The falling snow thins out between these distances, so it never shows
    // as a small cloud over the middle from high up.
    flakeFadeStart: 1.5,
    flakeFadeEnd: 3,
  },

  // How input moves along the path and turns the view. Path amounts are a
  // share of the whole path; turns are in degrees.
  cameraInput: {
    // Mac natural scrolling: fingers up = rise and pull back, like a map.
    // Set true to swap.
    invertScroll: false,
    invertTurn: false,
    // Trackpad two-finger swipe: path per pixel, degrees per pixel, and the
    // largest single delta counted (fast flicks are capped, never jump).
    trackpadPath: 0.0006,
    trackpadTurn: 0.1,
    trackpadMaxDelta: 60,
    // A swipe must move this many pixels before it picks an axis (up/down or
    // sideways); after that the other axis is ignored until the swipe ends.
    axisDeadZone: 6,
    // Silence (ms) that ends one swipe, including its momentum tail.
    gestureGap: 160,
    // A mouse wheel notch moves this share of the path, whatever size the
    // browser reports it as.
    wheelStep: 0.06,
    // Pinch on a trackpad (ctrl + wheel in Chrome, gestures in Safari):
    // path per unit of pinch delta, and per unit of log scale change.
    pinchPath: 0.014,
    pinchMaxDelta: 12,
    gesturePath: 0.5,
    // Mouse or one-finger drag on empty snow: degrees turned and path moved per pixel.
    dragTurn: 0.3,
    dragPath: 0.004,
    // Two fingers on a phone: path per unit of log pinch change.
    touchPinchPath: 0.5,
    // How quickly the view glides to where it was asked to go (higher =
    // snappier), and how quickly a flicked drag slows down after letting go.
    ease: 10,
    turnEase: 12,
    friction: 4.5,
  },

  // Turning the view.
  orbit: {
    // How far left and right the view may turn (degrees). Never behind the scene.
    yawLimit: 60,
    // Room kept around the characters when the play view pulls back to keep both in frame.
    fitMargin: 0.65,
  },

  layout: {
    // How far apart the two characters stand, and how much of the screen
    // width they may use before they are staggered front-to-back instead.
    characterDistance: 4.4,
    widthShare: 0.6,
  },

  snowfall: {
    count: 320,
    // Box the flakes fall through, centred on the play area.
    areaX: 16,
    areaZ: 12,
    height: 7,
    fallSpeed: 0.55,
    drift: 0.25,
    size: 0.05,
    opacity: 0.85,
  },

  // TEMPORARY: the drag-to-dent test hook.
  tempDrag: {
    ballRadius: 0.28,
    craterRadius: 0.5,
    // How much the test press may grow with camera distance. 1 = it keeps its
    // real size on the snow at any distance, so from far away a drag leaves a
    // thin track and close up a wide one (Rachel). Above 1 it grows up to
    // that many times bigger when seen from far.
    maxScale: 1,
    // Distance between stamps while dragging, as a share of the radius, and
    // never more than this many grid squares (wider gaps show as stripes).
    spacing: 0.25,
    maxStepCells: 1.5,
    // How fast holding still digs down, in units per second.
    digRate: 0.4,
    // A finger waits this long (seconds) before pressing, so a pinch leaves no dent.
    touchDelay: 0.09,
    // Moving faster than this (units per second) stops the digging: a drag
    // leaves a track, only a slow or still press digs a pit.
    digStopSpeed: 0.8,
    // Friction: how quickly the pressed point catches up with the finger,
    // in fresh snow (slow, heavy) and along a packed track (quick).
    followFresh: 16,
    followPacked: 30,
    // How quickly the resistance itself changes (per second), so crossing an
    // old track speeds the point up smoothly instead of jerking it.
    followSmoothing: 8,
    // The pressed point is never allowed to fall further behind than this
    // (scene units), so resistance never reads as dropped input.
    maxTrail: 0.35,
  },

  // Sharpest the picture is drawn at, in device pixels per CSS pixel, and
  // the most pixels drawn in total. Nearly all the work is filling pixels,
  // so on a big retina window the picture is drawn slightly less sharp to
  // keep slower computers smooth. Phones are below the limit.
  maxPixelRatio: 2,
  maxPixels: 3_200_000,
} as const;
