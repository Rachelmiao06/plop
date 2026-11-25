// Text, colours and every tunable number for the snow scene live here,
// not inside components. Distances are in scene units: one unit is the
// height of one character.
export const content = {
  title: "Plop!",
  tagline: "A cute snowy toy: pull back, roll a snowball, let go.",

  resetView: "Reset view",
  lookHint: "Drag to look around. Pinch or scroll to zoom.",

  // TEMPORARY: words for the press test hook. Remove with TempDragPress.
  tempLook: "Look",
  tempPress: "Press",
  tempPressHint: "Press and hold, or drag, on the snow. Double tap for a crater.",

  ground: {
    // Size of the snow slab (the play area is centred on 0, 0) and how round
    // its corners are.
    sizeX: 6.6,
    sizeZ: 5.6,
    centerZ: 0,
    cornerRadius: 0.9,
    // Close to the edge the snow cannot be pressed, so the side of the slab
    // stays whole. Pressing eases in over this distance from the edge.
    edgeLock: 0.4,
    // Thickness of the darker base the snow sits on.
    baseThickness: 0.2,
    // Width of one grid square. Smaller = finer dents, more work for the phone.
    cell: 0.04,
    // How far down the snow can be pressed before it hits hard ground.
    depth: 0.9,
    // Gentle drifts so the surface is not a flat sheet.
    driftHeight: 0.09,
    driftScale: 0.42,
    rippleHeight: 0.012,
    rippleScale: 2.6,
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
    // The soft backdrop behind the slab: top and bottom of the screen.
    fogTop: "#cfdcf0",
    fogBottom: "#e3eaf5",
    // The cut side of the slab: snow at the top of the cut, packed snow at
    // the bottom of it, the base under it, and the soft shadow it sits in.
    slabSideTop: "#dfe7f2",
    slabSideBottom: "#b9c9e6",
    slabBase: "#7a8db3",
    slabShadow: "#6f84b0",
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
    shadowArea: 6,
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
    // The camera looks this far in front of the middle (toward the viewer),
    // so the cut side of the slab is in view.
    targetZ: 1.1,
    // A tiny slow drift of the view, so sparkles glint.
    swayAmount: 0.12,
    swaySpeed: 0.22,
  },

  zoom: {
    // Closest view, as a share of the full-scene camera distance.
    closest: 0.36,
    // Wheel and trackpad-pinch sensitivity.
    wheelSpeed: 0.0015,
    trackpadPinchSpeed: 0.012,
    // How quickly the view glides to where it was asked to go (higher = snappier).
    ease: 9,
    // How far from the middle the view may wander when fully zoomed in.
    panX: 2.4,
    panZFar: 2.4,
    panZNear: 2.4,
  },

  // Turning the view by dragging on empty snow.
  orbit: {
    // Lowest and highest angle above the ground (degrees): side-on to nearly top-down.
    pitchMin: 25,
    pitchMax: 82,
    // How far left and right the view may turn (degrees). Never behind the scene.
    yawLimit: 60,
    // Degrees turned per pixel dragged.
    speed: 0.3,
    // How quickly the view glides after the finger (higher = snappier), and
    // how quickly a flick slows down after letting go.
    ease: 14,
    friction: 4.5,
    // Room kept around the characters when the view pulls back to keep both in frame.
    fitMargin: 0.65,
    // Opacity and reach of the soft shadow under the slab.
    shadowOpacity: 0.75,
    shadowReach: 1.6,
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
    // Distance between stamps while dragging, as a share of the radius.
    spacing: 0.25,
    // How fast holding still digs down, in units per second.
    digRate: 0.4,
    // A finger waits this long (seconds) before pressing, so a pinch leaves no dent.
    touchDelay: 0.09,
    // Moving faster than this (units per second) stops the digging: a drag
    // leaves a track, only a slow or still press digs a pit.
    digStopSpeed: 0.8,
    // Friction: how quickly the pressed point catches up with the finger,
    // in fresh snow (slow, heavy) and along a packed track (quick).
    followFresh: 6,
    followPacked: 20,
  },

  // Sharpest the picture is drawn at, in device pixels per CSS pixel.
  maxPixelRatio: 2,
} as const;
