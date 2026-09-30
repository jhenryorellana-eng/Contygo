"""ContyGo V10 · floating objects on a transparent background: the ContyGo «y» in 3D and paper documents.
Run headless: blender -b --factory-startup -P objects.py -- <out_dir> <textures_dir>
"""
import bpy, bmesh, math, os, sys
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
OUT, TEX = argv[0], argv[1]
os.makedirs(OUT, exist_ok=True)
MM = 0.001


def lin(hex_color):
    h = hex_color.lstrip("#")
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (*out, 1.0)


scene = bpy.context.scene
for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
scene.render.engine = "CYCLES"
prefs = bpy.context.preferences.addons["cycles"].preferences
try:
    prefs.compute_device_type = "OPTIX"
    prefs.get_devices()
    for d in prefs.devices:
        d.use = d.type == "OPTIX"
    scene.cycles.device = "GPU"
except Exception:
    pass
scene.cycles.samples = 128
scene.cycles.use_denoising = True
scene.render.film_transparent = True
scene.view_settings.view_transform = "Standard"
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
world = bpy.data.worlds.new("Studio")
scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.82, 0.86, 0.88, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.25


def principled(name, color, rough=0.5, coat=0.0, spec=0.5, metallic=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    p = mat.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = lin(color)
    p.inputs["Roughness"].default_value = rough
    p.inputs["Coat Weight"].default_value = coat
    p.inputs["Specular IOR Level"].default_value = spec
    p.inputs["Metallic"].default_value = metallic
    return mat


def textured(name, path, rough=0.7):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    p = nt.nodes["Principled BSDF"]
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(path)
    nt.links.new(tex.outputs["Color"], p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = rough
    p.inputs["Specular IOR Level"].default_value = 0.3
    return mat


M_GREEN = principled("Green", "#1fcf5f", rough=0.32, coat=0.5, spec=0.4)
M_NAVY = principled("Navy", "#07183a", rough=0.4, coat=0.5, spec=0.35)
M_IVORY = principled("Ivory", "#f3f5f2", rough=0.35, coat=0.5, spec=0.35)
M_PAPER_BACK = principled("PaperBack", "#e6dfcf", rough=0.8, spec=0.25)
M_FOLDER = principled("Folder", "#0a1f47", rough=0.65, spec=0.25)
M_TAB = principled("Tab", "#1fcf5f", rough=0.6, spec=0.25)
M_FORM = textured("Form", os.path.join(TEX, "doc-formulario.png"))
M_LIST = textured("List", os.path.join(TEX, "doc-lista.png"))


def area(name, loc, size, power, shadow=True):
    light = bpy.data.lights.new(name, "AREA")
    light.shape = "DISK"
    light.size = size
    light.energy = power
    light.use_shadow = shadow
    obj = bpy.data.objects.new(name, light)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    obj.rotation_euler = (Vector((0, 0, 0)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()


area("Key", (-0.42, -0.5, 0.55), 0.55, 16)
area("Fill", (0.55, -0.35, 0.12), 0.7, 5, shadow=False)
area("Rim", (0.25, 0.55, 0.35), 0.35, 14, shadow=False)
area("Top", (0, 0, 0.8), 0.9, 9)

cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam"))
cam.data.lens = 85
bpy.context.collection.objects.link(cam)
scene.camera = cam


def aim(distance, height=0.05, target=(0, 0, 0)):
    cam.location = (0, -distance, height)
    cam.rotation_euler = (Vector(target) - cam.location).to_track_quat("-Z", "Y").to_euler()


def hide_all():
    for obj in bpy.data.objects:
        if obj.type in ("MESH", "CURVE", "EMPTY"):
            obj.hide_render = True


def show(root):
    root.hide_render = False
    for child in root.children_recursive:
        child.hide_render = False


def render(path, res):
    scene.render.resolution_x, scene.render.resolution_y = res
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print("SAVED", path, flush=True)


# ------------------------------------------------------------ the «y» in 3D
def stroke(name, pts, bezier, radius, mat, size, depth_scale):
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = radius
    cu.bevel_resolution = 10
    cu.use_fill_caps = True
    f = lambda p: (-(p[0] - 512) / 1024 * size * -1, 0, -(p[1] - 512) / 1024 * size)
    if bezier:
        p0, c, p2 = pts
        sp = cu.splines.new("BEZIER")
        sp.bezier_points.add(1)
        h0 = (p0[0] + 2 / 3 * (c[0] - p0[0]), p0[1] + 2 / 3 * (c[1] - p0[1]))
        h1 = (p2[0] + 2 / 3 * (c[0] - p2[0]), p2[1] + 2 / 3 * (c[1] - p2[1]))
        a, b = sp.bezier_points
        a.co, a.handle_left, a.handle_right = f(p0), f(p0), f(h0)
        b.co, b.handle_left, b.handle_right = f(p2), f(h1), f(p2)
        sp.resolution_u = 32
    else:
        sp = cu.splines.new("POLY")
        sp.points.add(len(pts) - 1)
        for pt, co in zip(sp.points, pts):
            pt.co = (*f(co), 1)
    obj = bpy.data.objects.new(name, cu)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    obj.scale = (1, depth_scale, 1)
    return obj


SIZE = 0.16
symbol = bpy.data.objects.new("Symbol", None)
bpy.context.collection.objects.link(symbol)
r = 49.5 / 1024 * SIZE
tail = stroke("Tail", [(460, 605), (390, 785), (288, 780)], True, r, M_NAVY, SIZE, 0.62)
check = stroke("Check", [(313, 421), (473, 583), (755, 241)], False, r, M_GREEN, SIZE, 0.62)
tail.parent = check.parent = symbol

# ------------------------------------------------------------ paper documents
def sheet(name, w, h, mat_front, bend=0.0):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    res_x, res_z = 12, 16
    uv = bm.loops.layers.uv.new("UVMap")
    grid = []
    for j in range(res_z + 1):
        row = []
        for i in range(res_x + 1):
            u, v = i / res_x, j / res_z
            x, z = (u - .5) * w, (v - .5) * h
            # A lifted top-right corner, like a page someone is about to turn.
            lift = bend * max(0.0, (u - .55) / .45) ** 2 * max(0.0, (v - .6) / .4) ** 2
            row.append(bm.verts.new((x, -lift, z)))
        grid.append(row)
    for j in range(res_z):
        for i in range(res_x):
            f = bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
            for loop in f.loops:
                co = loop.vert.co
                loop[uv].uv = (co.x / w + .5, co.z / h + .5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat_front)
    sol = obj.modifiers.new("Thickness", "SOLIDIFY")
    sol.thickness = 0.9 * MM
    for poly in obj.data.polygons:
        poly.use_smooth = True
    return obj


form = sheet("Form", 0.0850, 0.1100, M_FORM, bend=0.018)
checklist = sheet("List", 0.0850, 0.1100, M_LIST)

folder = bpy.data.objects.new("Folder", None)
bpy.context.collection.objects.link(folder)
back_panel = sheet("FolderBack", 0.094, 0.116, M_FOLDER)
back_panel.location = (0, 0.006, 0.004)
front_panel = sheet("FolderFront", 0.094, 0.092, M_FOLDER)
front_panel.location = (0, -0.004, -0.008)
front_panel.rotation_euler = (math.radians(-14), 0, 0)
inner = sheet("FolderPaper", 0.084, 0.108, M_FORM)
inner.location = (0.002, 0.001, 0.012)
tab = sheet("FolderTab", 0.030, 0.012, M_TAB)
tab.location = (-0.022, 0.0062, 0.064)
for part in (back_panel, front_panel, inner, tab):
    part.parent = folder

# ------------------------------------------------------------ renders
hide_all()
show(symbol)
aim(0.62, 0.06)
for variant, tail_mat in (("claro", M_NAVY), ("oscuro", M_IVORY)):
    tail.data.materials[0] = tail_mat
    symbol.rotation_euler = (math.radians(4), 0, math.radians(-26))
    render(os.path.join(OUT, f"simbolo-{variant}.png"), (1000, 1000))
    symbol.rotation_euler = (math.radians(10), math.radians(8), math.radians(22))
    render(os.path.join(OUT, f"simbolo-{variant}-b.png"), (1000, 1000))

for light in [o for o in bpy.data.objects if o.type == "LIGHT"]:
    light.data.energy *= 0.72
for name, obj, rot in (("doc-formulario", form, (-12, -14, -16)), ("doc-lista", checklist, (-10, 12, 14)), ("carpeta", folder, (-6, -8, -20))):
    hide_all()
    show(obj)
    obj.rotation_euler = tuple(math.radians(a) for a in rot)
    aim(0.40, 0.09)
    render(os.path.join(OUT, f"{name}.png"), (800, 960))
