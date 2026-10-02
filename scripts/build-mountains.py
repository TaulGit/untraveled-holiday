"""Build layered coastal islands, using the generated limestone/scrub texture."""
import bpy, math
from pathlib import Path
from mathutils import Vector, noise
ROOT = Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
mat = bpy.data.materials.new('Weathered coastal limestone'); mat.use_nodes = True
nodes = mat.node_tree.nodes; links = mat.node_tree.links
bsdf = nodes.get('Principled BSDF'); bsdf.inputs['Roughness'].default_value = .92
tex = nodes.new('ShaderNodeTexImage'); tex.image = bpy.data.images.load(str(ROOT/'public/assets/textures/mountain.png'))
attr=nodes.new('ShaderNodeVertexColor');attr.layer_name='Coastal vegetation'
multiply=nodes.new('ShaderNodeMixRGB');multiply.blend_type='MULTIPLY';multiply.inputs[0].default_value=1
links.new(tex.outputs['Color'],multiply.inputs[1]);links.new(attr.outputs['Color'],multiply.inputs[2]);links.new(multiply.outputs[0],bsdf.inputs['Base Color'])
islands = []
for k,(cx,cz,rx,rz,height) in enumerate([(-43,-51,21,18,22),(39,-58,24,20,27),(-14,-83,26,17,26),(24,-100,24,20,31),(-66,-82,27,24,32),(69,-89,28,24,29)]):
    verts=[];faces=[];N=88
    for j in range(N+1):
        v=j/N*2-1
        for i in range(N+1):
            u=i/N*2-1
            edge=max(0,1-u*u-v*v)
            ridges = noise.noise_vector(Vector((u*3+k*7,v*3,1.3)))[0]
            fine = noise.noise_vector(Vector((u*16+k*7,v*16,4.7)))[0]
            peaks=(.62*math.exp(-((u+.22)**2*5+(v-.12)**2*5))+.48*math.exp(-((u-.35)**2*12+(v+.15)**2*8)))
            h=-3.5+height*edge**.6*max(.05,peaks+.22*ridges+.045*fine)
            verts.append((cx+u*rx,-cz-v*rz,h))
    for j in range(N):
        for i in range(N):
            a=j*(N+1)+i;faces.append((a,a+N+1,a+N+2,a+1))
    mesh=bpy.data.meshes.new('Eroded island');mesh.from_pydata(verts,[],faces);mesh.update()
    ob=bpy.data.objects.new(f'coast_background_island_{k}',mesh);bpy.context.collection.objects.link(ob);mesh.materials.append(mat)
    colors=mesh.color_attributes.new(name='Coastal vegetation',type='FLOAT_COLOR',domain='CORNER')
    for poly in mesh.polygons:
        green=poly.normal.z>.72 and poly.center.z>0
        tint=(.42,.59,.30,1) if green else (.92,.95,.89,1)
        for li in poly.loop_indices:colors.data[li].color=tint
    uv=mesh.uv_layers.new(name='Rock strata')
    for poly in mesh.polygons:
        poly.use_smooth=True
        for li in poly.loop_indices:
            co=mesh.vertices[mesh.loops[li].vertex_index].co
            uv.data[li].uv=(co.x/11,(co.y+co.z*1.8)/11)
    islands.append(ob)
bpy.ops.object.select_all(action='DESELECT')
for ob in islands:ob.select_set(True)
bpy.context.view_layer.objects.active=islands[0]
links.remove(bsdf.inputs['Base Color'].links[0]);links.new(tex.outputs['Color'],bsdf.inputs['Base Color'])
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/assets/scenery/mountains.glb'),export_format='GLB',use_selection=True,export_yup=True)
links.remove(bsdf.inputs['Base Color'].links[0]);links.new(multiply.outputs[0],bsdf.inputs['Base Color'])
# A source-scene render checks silhouettes, lighting and the texture together.
bpy.ops.mesh.primitive_plane_add(size=300,location=(0,50,-2.65));sea=bpy.context.object
water=bpy.data.materials.new('Sea');water.diffuse_color=(.035,.48,.59,1);sea.data.materials.append(water)
scene.world.use_nodes=True
env=scene.world.node_tree.nodes.new('ShaderNodeTexEnvironment');env.image=bpy.data.images.load(str(ROOT/'public/assets/textures/sky.png'));scene.world.node_tree.links.new(env.outputs['Color'],scene.world.node_tree.nodes['Background'].inputs['Color']);scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.6
bpy.ops.object.light_add(type='SUN',location=(-20,0,40));bpy.context.object.rotation_euler=(.5,-.4,-.5);bpy.context.object.data.energy=3
bpy.ops.object.camera_add(location=(0,12,2.2));cam=bpy.context.object;cam.rotation_euler=(Vector((0,76,7))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=22;cam.data.clip_end=350;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=12;scene.cycles.use_denoising=True
scene.render.resolution_x=1200;scene.render.resolution_y=700;scene.render.resolution_percentage=100
scene.render.filepath=str(ROOT/'assets/scenes/mountains-preview.png')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/scenes/mountains.blend'))
bpy.ops.render.render(write_still=True)
