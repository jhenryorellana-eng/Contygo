"""ContyGo V10 · 3D phone with the ContyGo case, rendered on a transparent background with a real
shadow (shadow catcher), so it floats over the page in light and dark.

Run headless (never touches an open Blender session):
  blender -b --factory-startup -P phone.py -- <mode> <out_dir> <screens_dir>
modes: test (one low-res frame) · seq (turntable back → front) · stills (front pose, one per screen)
       · back (hero back pose, high-res)
"""
import bpy, bmesh, math, os, sys
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else ["test", ".", "."]
MODE, OUT, SCREENS = argv[0], argv[1], argv[2]
os.makedirs(OUT, exist_ok=True)
MM = 0.001


def lin(hex_color):
    """sRGB hex → linear RGBA."""
    h = hex_color.lstrip("#")
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (*out, 1.0)


# ---------------------------------------------------------------- scene
scene = bpy.context.scene
for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
scene.render.engine = "CYCLES"
prefs = bpy.context.preferences.addons["cycles"].preferences
for kind in ("OPTIX", "CUDA"):
    try:
        prefs.compute_device_type = kind
        prefs.get_devices()
        usable = [d for d in prefs.devices if d.type == kind]
        if usable:
            for d in prefs.devices:
                d.use = d.type == kind
            scene.cycles.device = "GPU"
            break
    except Exception:
        continue
scene.cycles.samples = 24 if MODE == "test" else 128
scene.cycles.use_denoising = True
try:
    scene.cycles.denoiser = "OPTIX"
except Exception:
    scene.cycles.denoiser = "OPENIMAGEDENOISE"
scene.render.film_transparent = True
scene.view_settings.view_transform = "Standard"
scene.view_settings.look = "None"
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.image_settings.color_depth = "8"
scene.render.resolution_x, scene.render.resolution_y = (960, 1200)
if MODE == "back":
    scene.render.resolution_x, scene.render.resolution_y = (1200, 1500)
scene.render.resolution_percentage = 100

world = bpy.data.worlds.new("Studio")
scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes["Background"]
bg.inputs["Color"].default_value = (0.82, 0.86, 0.88, 1)
bg.inputs["Strength"].default_value = 0.22


# ---------------------------------------------------------------- materials
def principled(name, color, rough=0.5, coat=0.0, coat_rough=0.1, metallic=0.0, spec=0.5):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    p = mat.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = lin(color) if isinstance(color, str) else color
    p.inputs["Roughness"].default_value = rough
    p.inputs["Metallic"].default_value = metallic
    p.inputs["Coat Weight"].default_value = coat
    p.inputs["Coat Roughness"].default_value = coat_rough
    p.inputs["Specular IOR Level"].default_value = spec
    return mat


def case_material():
    mat = principled("Case", "#061634", rough=0.55, coat=0.06, coat_rough=0.4, spec=0.26)
    nt = mat.node_tree
    p = nt.nodes["Principled BSDF"]
    # Fine silicone grain.
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 900.0
    noise.inputs["Detail"].default_value = 4.0
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.035
    nt.links.new(noise.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], p.inputs["Normal"])
    p.inputs["Sheen Weight"].default_value = 0.0
    p.inputs["Sheen Tint"].default_value = lin("#5f7aa3")
    return mat


def screen_material(image_path):
    mat = bpy.data.materials.new("Screen")
    mat.use_nodes = True
    nt = mat.node_tree
    p = nt.nodes["Principled BSDF"]
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(image_path, check_existing=True)
    tex.interpolation = "Cubic"
    p.inputs["Base Color"].default_value = (0, 0, 0, 1)
    p.inputs["Roughness"].default_value = 0.08
    p.inputs["Coat Weight"].default_value = 0.12
    p.inputs["Coat Roughness"].default_value = 0.04
    p.inputs["Specular IOR Level"].default_value = 0.08
    nt.links.new(tex.outputs["Color"], p.inputs["Emission Color"])
    p.inputs["Emission Strength"].default_value = 1.0
    return mat, tex


M_CASE = case_material()
M_GLASS = principled("Glass", "#04070d", rough=0.05, coat=1.0, coat_rough=0.02, spec=0.7)
M_METAL = principled("Metal", "#6f7680", rough=0.28, metallic=1.0)
M_LENS = principled("Lens", "#020306", rough=0.02, coat=1.0, coat_rough=0.01, spec=0.9)
M_LENS_RING = principled("LensRing", "#2a3038", rough=0.22, metallic=1.0)
M_CHECK = principled("Check", "#1fcf5f", rough=0.4, coat=0.3, coat_rough=0.2, spec=0.3)
M_TAIL = principled("Tail", "#f6f8f7", rough=0.35, coat=0.6, coat_rough=0.15)
M_DARK = principled("Port", "#000000", rough=0.35, spec=0.2)
M_FLASH = principled("Flash", "#d9d2bf", rough=0.3, coat=0.8)
M_SCREEN, SCREEN_TEX = screen_material(os.path.join(SCREENS, "servicios.png"))


# ---------------------------------------------------------------- geometry helpers
def rrect(w, h, r, seg=14):
    pts = []
    corners = [(w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90), (-w / 2 + r, -h / 2 + r, 180), (w / 2 - r, -h / 2 + r, 270)]
    for cx, cz, start in corners:
        for i in range(seg + 1):
            a = math.radians(start + 90 * i / seg)
            pts.append((cx + r * math.cos(a), cz + r * math.sin(a)))
    return pts


def slab(name, w, h, d, r, edge, y_front, mat, seg=14, edge_seg=4):
    """Rounded-rectangle slab in the XZ plane, front face at y_front, extruded toward +Y by d."""
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    verts = [bm.verts.new((x, y_front, z)) for x, z in rrect(w, h, r, seg)]
    face = bm.faces.new(verts)
    ext = bmesh.ops.extrude_face_region(bm, geom=[face])
    moved = [e for e in ext["geom"] if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, verts=moved, vec=(0, d, 0))
    bm.normal_update()
    if edge > 0:
        caps = [e for e in bm.edges if all(abs(v.co.y - y_front) < 1e-7 or abs(v.co.y - (y_front + d)) < 1e-7 for v in e.verts)
                and abs(e.verts[0].co.y - e.verts[1].co.y) < 1e-7]
        bmesh.ops.bevel(bm, geom=caps, offset=edge, segments=edge_seg, profile=0.5, affect="EDGES", clamp_overlap=True)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    mod = obj.modifiers.new("Smooth", "SMOOTH_BY_ANGLE") if hasattr(bpy.types, "SmoothByAngleModifier") else None
    if mod is None:
        try:
            obj.data.set_sharp_from_angle(angle=math.radians(35))
        except Exception:
            pass
    return obj


def flat_rrect(name, w, h, r, y, mat, seg=16, uv=False):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    pts = rrect(w, h, r, seg)
    verts = [bm.verts.new((x, y, z)) for x, z in pts]
    face = bm.faces.new(verts)
    if uv:
        layer = bm.loops.layers.uv.new("UVMap")
        for loop in face.loops:
            co = loop.vert.co
            loop[layer].uv = ((co.x + w / 2) / w, (co.z + h / 2) / h)
    face.normal_update()
    if face.normal.y > 0:
        face.normal_flip()
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    return obj


def cylinder(name, radius, depth, loc, mat, axis_y=True, verts=48):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth, location=loc,
                                        rotation=(math.radians(90), 0, 0) if axis_y else (0, 0, 0))
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    bev = obj.modifiers.new("Bevel", "BEVEL")
    bev.width = min(radius * .25, 0.0004)
    bev.segments = 3
    return obj


def stroke_curve(name, points, bezier, radius, mat, scale, offset):
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = radius
    cu.bevel_resolution = 6
    cu.use_fill_caps = True
    if bezier:
        p0, c, p2 = points
        sp = cu.splines.new("BEZIER")
        sp.bezier_points.add(1)
        h0 = (p0[0] + 2 / 3 * (c[0] - p0[0]), p0[1] + 2 / 3 * (c[1] - p0[1]))
        h1 = (p2[0] + 2 / 3 * (c[0] - p2[0]), p2[1] + 2 / 3 * (c[1] - p2[1]))
        a, b = sp.bezier_points
        a.co, a.handle_left, a.handle_right = offset(p0), offset(p0), offset(h0)
        b.co, b.handle_left, b.handle_right = offset(p2), offset(h1), offset(p2)
        sp.resolution_u = 24
    else:
        sp = cu.splines.new("POLY")
        sp.points.add(len(points) - 1)
        for pt, co in zip(sp.points, points):
            pt.co = (*offset(co), 1)
    obj = bpy.data.objects.new(name, cu)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    return obj


# ---------------------------------------------------------------- the phone
phone = bpy.data.objects.new("Phone", None)
bpy.context.collection.objects.link(phone)

CW, CH, CD, CR = 71.0 * MM, 145.8 * MM, 10.4 * MM, 11.6 * MM   # case
GW, GH, GR = 67.6 * MM, 142.4 * MM, 10.0 * MM                  # front glass
SW, SH, SR = 63.9 * MM, 138.6 * MM, 8.4 * MM                   # screen (1179×2556)
front = -CD / 2

parts = []
parts.append(slab("Case", CW, CH, CD, CR, 3.1 * MM, front, M_CASE, seg=18, edge_seg=6))
parts.append(slab("Glass", GW, GH, 0.5 * MM, GR, 0.25 * MM, front - 0.45 * MM, M_GLASS, seg=18, edge_seg=2))
screen = flat_rrect("Screen", SW, SH, SR, front - 0.47 * MM, M_SCREEN, uv=True)
parts.append(screen)
island = slab("Island", 20.4 * MM, 6.0 * MM, 0.05 * MM, 3.0 * MM, 0, front - 0.49 * MM, M_DARK, seg=10)
island.location = (0, 0, SH / 2 - 1.9 * MM - 3.0 * MM)
parts.append(island)

# Back: camera plate, lenses, flash, ContyGo symbol.
back = CD / 2
plate_c = (CW / 2 - 4.2 * MM - 14.5 * MM, CH / 2 - 4.2 * MM - 14.5 * MM)
ring = slab("CameraRing", 31.5 * MM, 31.5 * MM, 1.1 * MM, 8.4 * MM, 0.5 * MM, back - 0.2 * MM, M_CASE, seg=12, edge_seg=3)
ring.location = (plate_c[0], 0, plate_c[1])
plate = slab("CameraPlate", 28.6 * MM, 28.6 * MM, 1.25 * MM, 7.2 * MM, 0.3 * MM, back - 0.2 * MM, M_GLASS, seg=12, edge_seg=2)
plate.location = (plate_c[0], 0, plate_c[1])
parts += [ring, plate]
for i, (dx, dz) in enumerate(((-6.6, 6.6), (6.6, -6.6))):
    x, z = plate_c[0] + dx * MM, plate_c[1] + dz * MM
    parts.append(cylinder(f"LensRing{i}", 5.6 * MM, 1.5 * MM, (x, back + 1.2 * MM, z), M_LENS_RING))
    parts.append(cylinder(f"Lens{i}", 4.3 * MM, 1.6 * MM, (x, back + 1.3 * MM, z), M_LENS))
parts.append(cylinder("Flash", 2.3 * MM, 0.6 * MM, (plate_c[0] + 7.2 * MM, back + 1.05 * MM, plate_c[1] + 7.2 * MM), M_FLASH))

SYM = 30.0 * MM
def sym_xy(p):
    return (-(p[0] - 512) / 1024 * SYM, back + 0.25 * MM, -(p[1] - 512) / 1024 * SYM - 6 * MM)
r_stroke = 49.5 / 1024 * SYM
tail = stroke_curve("LogoTail", [(460, 605), (390, 785), (288, 780)], True, r_stroke, M_TAIL, SYM, sym_xy)
check = stroke_curve("LogoCheck", [(313, 421), (473, 583), (755, 241)], False, r_stroke, M_CHECK, SYM, sym_xy)
for logo in (tail, check):
    logo.scale = (1, 0.28, 1)
    logo.location.y = back * (1 - 0.28)
parts += [tail, check]

# Side buttons (covered by the case) and bottom port.
def bump(name, w, h, loc):
    b = slab(name, 1.2 * MM, h, w, 0.55 * MM, 0.35 * MM, -w / 2, M_CASE, seg=6, edge_seg=2)
    b.rotation_euler = (0, 0, math.radians(90))
    b.location = loc
    return b
parts.append(bump("Action", 4.2 * MM, 7.0 * MM, (-CW / 2 - 0.35 * MM, 0, CH / 2 - 28 * MM)))
parts.append(bump("VolUp", 4.2 * MM, 11.0 * MM, (-CW / 2 - 0.35 * MM, 0, CH / 2 - 42 * MM)))
parts.append(bump("VolDown", 4.2 * MM, 11.0 * MM, (-CW / 2 - 0.35 * MM, 0, CH / 2 - 56 * MM)))
parts.append(bump("Power", 4.2 * MM, 17.0 * MM, (CW / 2 + 0.35 * MM, 0, CH / 2 - 46 * MM)))
port = slab("Port", 9.6 * MM, 3.4 * MM, 2.0 * MM, 1.7 * MM, 0, -1.0 * MM, M_DARK, seg=8)
port.rotation_euler = (math.radians(90), 0, 0)
port.location = (0, 0, -CH / 2 + 0.6 * MM)
parts.append(port)
for i in range(6):
    parts.append(cylinder(f"Speaker{i}", 0.6 * MM, 2.0 * MM, ((12.5 + i * 2.4) * MM, 0, -CH / 2), M_DARK, axis_y=False, verts=16))

for obj in parts:
    obj.parent = phone

# ---------------------------------------------------------------- stage: floating over its own shadow
bpy.ops.mesh.primitive_plane_add(size=1.6, location=(0, 0, -CH / 2 - 34 * MM))
catcher = bpy.context.active_object
catcher.name = "ShadowCatcher"
catcher.is_shadow_catcher = True

def area(name, loc, size, power, color="#ffffff", shadow=True):
    light = bpy.data.lights.new(name, "AREA")
    light.shape = "DISK"
    light.size = size
    light.energy = power
    light.color = lin(color)[:3]
    light.use_shadow = shadow
    obj = bpy.data.objects.new(name, light)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    direction = Vector((0, 0, -0.01)) - Vector(loc)
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    return obj

area("Key", (-0.42, -0.5, 0.55), 0.55, 16)
area("Fill", (0.55, -0.35, 0.12), 0.7, 5, "#eef3ff", shadow=False)
area("Rim", (0.25, 0.55, 0.35), 0.35, 14, "#f2fff6", shadow=False)
area("Top", (0, 0, 0.8), 0.9, 9)

cam_data = bpy.data.cameras.new("Cam")
cam_data.lens = 85
cam = bpy.data.objects.new("Cam", cam_data)
bpy.context.collection.objects.link(cam)
scene.camera = cam
cam.location = (0, -0.66, 0.085)
target = Vector((0, 0, -0.012))
cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()

TILT_X, ROLL_Y = math.radians(7), math.radians(-5)
BACK_ANGLE, FRONT_ANGLE = math.radians(198), math.radians(-24)

def pose(angle, lift=0.0):
    phone.rotation_mode = "XYZ"
    phone.rotation_euler = (TILT_X, ROLL_Y, angle)
    phone.location = (0, 0, lift)

def set_screen(name):
    SCREEN_TEX.image = bpy.data.images.load(os.path.join(SCREENS, f"{name}.png"), check_existing=True)

def render(path):
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print("SAVED", path, flush=True)

if MODE == "test":
    pose(math.radians(150))
    render(os.path.join(OUT, "test-back.png"))
    pose(FRONT_ANGLE)
    render(os.path.join(OUT, "test-front.png"))
elif MODE == "back":
    pose(BACK_ANGLE)
    render(os.path.join(OUT, "phone-back.png"))
elif MODE == "seq":
    frames = int(argv[3]) if len(argv) > 3 else 48
    set_screen("servicios")
    for f in range(frames):
        t = f / (frames - 1)
        e = t * t * (3 - 2 * t)
        pose(BACK_ANGLE + (FRONT_ANGLE - BACK_ANGLE) * e)
        render(os.path.join(OUT, f"seq-{f:03d}.png"))
elif MODE == "stills":
    pose(FRONT_ANGLE)
    for name in argv[3].split(","):
        set_screen(name)
        render(os.path.join(OUT, f"front-{name}.png"))
elif MODE == "poses":
    # name:angle:tilt:roll:screen, separated by commas.
    for spec in argv[3].split(","):
        name, angle, tilt, roll, screen_name = spec.split(":")
        phone.rotation_mode = "XYZ"
        phone.rotation_euler = (math.radians(float(tilt)), math.radians(float(roll)), math.radians(float(angle)))
        set_screen(screen_name)
        render(os.path.join(OUT, f"pose-{name}.png"))
elif MODE == "idle":
    # Seamless 4 s loop at 24 fps: the phone breathes (rises 5 mm, sways 3°) over its own shadow.
    # Rendered transparent; composited later onto the page's exact colour, so it matches to the pixel.
    set_screen("servicios")
    frames = 96
    for f in range(frames):
        t = f / frames * 2 * math.pi
        phone.rotation_mode = "XYZ"
        phone.rotation_euler = (TILT_X + math.radians(1.2) * math.sin(t + 1.1), ROLL_Y, FRONT_ANGLE + math.radians(3) * math.sin(t))
        phone.location = (0, 0, 0.005 * math.sin(t))
        render(os.path.join(OUT, f"idle-{f:03d}.png"))
