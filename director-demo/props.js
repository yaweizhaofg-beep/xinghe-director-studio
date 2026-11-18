import * as THREE from './vendor/three.module.js';

export function createProp(kind) {
  const group = new THREE.Group();
  const material = color => new THREE.MeshStandardMaterial({ color, roughness: .65 });
  const wood = material('#c0a27b'), fabric = material('#687a82'), metal = material('#34454b');
  const cream = material('#e1d9c7'), paint = material('#718f9c');
  function box(parent, mat, x, y, z, w, h, d) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
  }
  function cylinder(parent, mat, x, y, z, radius, height) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 24), mat);
    m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
  }
  function chair(parent, x, y, z) {
    box(parent, fabric, x, y + .44, z, .5, .08, .5);
    box(parent, fabric, x, y + .72, z - .22, .5, .55, .08);
    for (const a of [-.2, .2]) for (const b of [-.2, .2]) box(parent, metal, x + a, y + .2, z + b, .045, .4, .045);
  }
  switch (kind) {
    case 'chair': chair(group, 0, 0, 0); break;
    case 'table':
      box(group, wood, 0, .78, 0, 1.6, .08, .8);
      for (const x of [-.68, .68]) for (const z of [-.3, .3]) box(group, metal, x, .37, z, .07, .74, .07);
      break;
    case 'window':
      for (const x of [-.7, 0, .7]) box(group, wood, x, 1.5, 0, .07, 1.4, .09);
      for (const y of [.8, 2.2]) box(group, wood, 0, y, 0, 1.47, .07, .12);
      box(group, wood, 0, .76, .04, 1.6, .06, .3);
      box(group, new THREE.MeshStandardMaterial({ color: '#b4d8e5', transparent: true, opacity: .22 }), 0, 1.5, 0, 1.35, 1.3, .015);
      break;
    case 'lamp':
      cylinder(group, metal, 0, .035, 0, .22, .07);
      cylinder(group, metal, 0, .72, 0, .022, 1.4);
      const shade = new THREE.Mesh(new THREE.ConeGeometry(.29, .35, 28, 1, true), new THREE.MeshStandardMaterial({ color: '#eadbbc', side: THREE.DoubleSide }));
      shade.position.y = 1.57; group.add(shade);
      const bulb = new THREE.PointLight('#ffe2ad', 5, 4);
      bulb.position.y = 1.45; group.add(bulb);
      break;
    case 'dishes':
      cylinder(group, cream, 0, .02, 0, .16, .025);
      cylinder(group, cream, .25, .07, 0, .05, .14);
      box(group, metal, -.22, .018, 0, .025, .012, .25);
      break;
    case 'bed':
      box(group, wood, 0, .22, 0, 1.5, .35, 2.15);
      box(group, cream, 0, .48, 0, 1.45, .22, 2.05);
      box(group, wood, 0, .57, -1.08, 1.55, 1.05, .09);
      box(group, fabric, 0, .61, -.72, 1.1, .12, .4);
      break;
    case 'car': {
      box(group, paint, 0, .46, 0, 1.7, .3, 3.8);
      box(group, paint, 0, .76, 1.3, 1.66, .3, 1.1);
      box(group, paint, 0, .76, -1.49, 1.66, .3, .7);
      box(group, paint, 0, 1.58, -.05, 1.65, .08, 1.88);
      for (const x of [-.78, .78]) for (const z of [-.95, .88]) box(group, metal, x, 1.22, z, .07, .7, .08);
      for (const x of [-.86, .86]) for (const z of [-1.25, 1.25]) {
        const wheel = cylinder(group, metal, x, .33, z, .33, .16); wheel.rotation.z = Math.PI / 2;
      }
      chair(group, -.4, .21, -.15); chair(group, .4, .21, -.15);
      box(group, metal, 0, .94, .65, 1.5, .13, .2);
      const hinge = new THREE.Group();
      hinge.position.set(-.87, .6, .85);
      group.add(hinge);
      box(hinge, paint, 0, .15, -.6, .07, .42, 1.2);
      box(hinge, metal, 0, .65, -.6, .04, .035, 1.2);
      for (const z of [-1.18, -.02]) box(hinge, metal, 0, .48, z, .04, .4, .035);
      box(hinge, cream, -.06, .26, -.94, .05, .035, .16);
      group.userData.door = hinge;
      group.userData.open = false;
      group.userData.seat = new THREE.Vector3(-.4, .21, -.15);
      break;
    }
  }
  group.userData.kind = kind;
  return group;
}
