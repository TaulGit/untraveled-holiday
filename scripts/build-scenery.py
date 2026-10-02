"""Author the holiday courtyard in Blender; export two game-ready scene layers.
Run: blender --background --factory-startup --python scripts/build-scenery.py
All design coordinates are game coordinates (X right, Y up, -Z forward).
"""
import bpy, math, random, json
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/assets/scenery'
SOURCE = ROOT / 'assets/scenes'
OUT.mkdir(parents=True, exist_ok=True)
SOURCE.mkdir(parents=True, exist_ok=True)
random.seed(731)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.name = 'South Cape - Holiday Courtyard'
scene.unit_settings.system = 'METRIC'
REGION = 'coast'
batches = {}
materials = {}

def color(hexcode):
    v = [int(hexcode[i:i+2],16)/255 for i in (0,2,4)]
    return tuple(c/12.92 if c <= .04045 else ((c+.055)/1.055)**2.4 for c in v)

palette = {
    'limestone':'EEECDC','ivory':'FFF6DE','stone_shadow':'BBCDC8',
    'tile':'D5E0D5','tile_warm':'E6DCCA','tile_blush':'E9C6B3',
    'terracotta':'C57558','wood':'976A4B','wood_light':'BC9265',
    'teal':'387B82','ink':'254B59','brass':'C5A367',
    'leaf':'398E70','leaf_light':'86B88C','leaf_dark':'276B59',
    'lavender':'A28AB7','flower':'EBA4B3','flower_gold':'F3C57B',
    'sand':'E3CFAB','rock':'93B7AE','distant':'A3CFCE','cloud':'F6FFEE',
    'sea':'42B8C5','foam':'BAEDE1','glow':'FFE6A0', 'rug':'D78277',
}
for name, value in palette.items():
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color(value),1)
    m.use_nodes = True
    node = m.node_tree.nodes.get('Principled BSDF')
    node.inputs['Base Color'].default_value = (*color(value),1)
    node.inputs['Roughness'].default_value = .82 if name != 'brass' else .35
    if name == 'brass': node.inputs['Metallic'].default_value = .55
    if name == 'glow':
        node.inputs['Emission Color'].default_value = (*color(value),1)
        node.inputs['Emission Strength'].default_value = 2
    materials[name] = m

def mesh(mat, verts, faces, part='detail'):
    key = (REGION,part,mat)
    vv,ff = batches.setdefault(key,([],[]))
    n=len(vv)
    vv.extend((x,-z,y) for x,y,z in verts)
    ff.extend(tuple(n+i for i in f) for f in faces)

def box(x,y,z,w,h,d,mat='limestone',part='architecture',yaw=0):
    verts=[]
    for a,b,c in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]:
        u,v=a*w/2,c*d/2
        verts.append((x+u*math.cos(yaw)+v*math.sin(yaw),y+b*h/2,z-u*math.sin(yaw)+v*math.cos(yaw)))
    mesh(mat,verts,[(0,3,2,1),(4,5,6,7),(0,4,7,3),(1,2,6,5),(0,1,5,4),(3,7,6,2)],part)

def cylinder(x,y,z,r,h,mat='limestone',top=None,n=14,part='detail'):
    rt=r if top is None else top
    verts=[(x+rr*math.cos(i*math.tau/n),yy,z+rr*math.sin(i*math.tau/n)) for yy,rr in [(y-h/2,r),(y+h/2,rt)] for i in range(n)]
    faces=[tuple(range(n)),tuple(range(2*n-1,n-1,-1))]
    faces += [(i,n+i,n+(i+1)%n,(i+1)%n) for i in range(n)]
    mesh(mat,verts,faces,part)

def ellipsoid(x,y,z,rx,ry,rz,mat='leaf',n=12,rings=7,part='foliage'):
    verts=[]
    for j in range(rings+1):
        p=math.pi*j/rings
        for i in range(n):
            a=math.tau*i/n
            verts.append((x+rx*math.sin(p)*math.cos(a),y+ry*math.cos(p),z+rz*math.sin(p)*math.sin(a)))
    faces=[(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for j in range(rings) for i in range(n)]
    mesh(mat,verts,faces,part)

def arch(x,z,width=2.6,height=3.6,depth=.45,yaw=0):
    r=width/2; t=.26; spring=height-r
    def convert(u,v,w):return (x+u*math.cos(yaw)+w*math.sin(yaw),v,z-u*math.sin(yaw)+w*math.cos(yaw))
    for u in [-r-t/2,r+t/2]:
        px,_,pz=convert(u,0,0)
        box(px,spring/2,pz,t,spring,depth,'limestone',yaw=yaw)
        box(px,.1,pz,t+.16,.2,depth+.15,'ivory',yaw=yaw)
        box(px,spring-.03,pz,t+.1,.12,depth+.1,'ivory',yaw=yaw)
    for i in range(24):
        a=math.pi*i/24;b=math.pi*(i+1)/24
        verts=[convert(rr*math.cos(aa),spring+rr*math.sin(aa),zz) for zz in [-depth/2,depth/2] for rr,aa in [(r,a),(r,b),(r+t,b),(r+t,a)]]
        mesh('limestone',verts,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2),(0,4,7,3),(1,2,6,5)],'architecture')
    box(x,height+.33,z,width+.8,.19,depth+.23,'ivory',yaw=yaw)

def leaf(x,y,z,length,angle,mat='leaf',width=.18,rise=.5):
    verts=[]
    for i in range(6):
        t=i/5;spread=math.sin(math.pi*t)*width
        for s in [-1,1]:
            u=t*length;v=s*spread
            verts.append((x+math.cos(angle)*u-math.sin(angle)*v,y+math.sin(t*math.pi*.78)*rise-.1*t,z+math.sin(angle)*u+math.cos(angle)*v))
    mesh(mat,verts,[(i*2,i*2+1,i*2+3,i*2+2) for i in range(5)],'foliage')

def shrub(x,y,z,s=1,flowers=False):
    for i in range(11):
        a=i*2.4
        leaf(x,y,z,random.uniform(.45,.9)*s,a,random.choice(['leaf','leaf_light','leaf_dark']),.12*s,.7*s)
    if flowers:
        for i in range(5):
            a=i*2.4;xx=x+math.cos(a)*.25*s;zz=z+math.sin(a)*.25*s
            cylinder(xx,y+.33*s,zz,.015,.65*s,'leaf_dark',n=5,part='foliage')
            ellipsoid(xx,y+.7*s,zz,.1*s,.07*s,.1*s,random.choice(['lavender','flower','flower_gold']),n=7,rings=4)

def pot(x,y,z,s=1):
    cylinder(x,y+.28*s,z,.23*s,.56*s,'terracotta',top=.37*s,n=20)
    cylinder(x,y+.56*s,z,.39*s,.1*s,'terracotta',n=20)
    cylinder(x,y+.605*s,z,.33*s,.018,'wood',n=20)
    shrub(x,y+.61*s,z,s,True)

def ivy(x,y,z,length=2):
    for i in range(int(length/.13)):
        yy=y-i*.13;xx=x+math.sin(i*.63)*.07
        leaf(xx,yy,z,.26,(-1 if i%2 else 1)*1.3,'leaf_dark' if i%3 else 'leaf_light',.11,.06)

def bench(x,z,yaw=0):
    def pos(u,v):return x+u*math.cos(yaw)+v*math.sin(yaw),z-u*math.sin(yaw)+v*math.cos(yaw)
    for u in [-.76,.76]:
        xx,zz=pos(u,0);box(xx,.25,zz,.18,.5,.62,'limestone',yaw=yaw)
    for i in range(5):
        xx,zz=pos(0,-.26+i*.13);box(xx,.58,zz,2,.09,.1,'wood_light',yaw=yaw)
    for i in range(3):
        xx,zz=pos(0,-.31);box(xx,.85+i*.17,zz,2,.12,.06,'wood',yaw=yaw)

def lantern(x,z):
    cylinder(x,.08,z,.18,.16,'limestone')
    cylinder(x,.91,z,.045,1.8,'ink',n=8)
    box(x,1.9,z,.28,.42,.28,'glow',part='detail')
    for dx in [-.15,.15]:
        for dz in [-.15,.15]:box(x+dx,1.9,z+dz,.028,.5,.028,'ink',part='detail')
    cylinder(x,2.17,z,.27,.16,'ink',top=.03,n=4)

# The two islands preserve the puzzle's crossing and collection coordinates.
for z,d in [(-7.35,6.6),(-19.47,11.65)]:
    box(0,-.32,z,20.5,.65,d,'limestone')
    box(0,-.83,z,19.8,.42,d-.7,'stone_shadow')
    box(0,-1.2,z,18.9,.34,d-1.3,'ivory')
    for x in [-8.4,8.4]:
        for zz in [z-d*.31,z+d*.31]:cylinder(x,-2,zz,.5,2.2,'stone_shadow',top=.82,n=8)
    for x in [-9.8,9.8]:
        box(x,.2,z,.26,.4,d-.2,'ivory')
    # Carefully spaced tile joints and a contrasting border define the walking route.
    for ix in range(-4,4):
        for iz in range(int(d/.78)):
            zz=z-d/2+.42+iz*.78
            box(ix*.83+.415,.025,zz,.805,.05,.754,random.choice(['tile','tile','tile_warm']),part='paving')
    for x in [-3.44,3.44]:box(x,.027,z,.11,.052,d-.08,'teal',part='paving')
    for side in [-1,1]:
        for zz in [z-d*.29,z+d*.29]:
            x=side*4.55
            box(x,.3,zz,1.2,.6,2.0,'limestone')
            box(x,.64,zz,1.34,.13,2.14,'ivory')
            box(x,.714,zz,1.1,.025,1.89,'sand',part='detail')
            for j in range(7):shrub(x+random.uniform(-.42,.42),.73,zz+random.uniform(-.78,.78),random.uniform(.55,.9),j%2==0)
    for i in range(32):
        x=random.choice([-1,1])*random.uniform(7.5,9.55);zz=z+random.uniform(-d*.43,d*.43)
        shrub(x,.03,zz,random.uniform(.45,.85),i%3==0)

# Repeated arcade bays and pergolas frame, rather than obscure, the landmarks.
for side in [-1,1]:
    for zz in [-16.4,-19.5,-22.6]:arch(side*7.4,zz,2.65,3.65,.5,math.pi/2)
    box(side*8.8,4.05,-19.5,3.5,.27,9.9,'limestone')
    box(side*10.15,1.9,-19.5,.3,3.8,9.9,'limestone')
    for zz in [-15.1,-18.1,-21.2,-24]:
        cylinder(side*7.4,1.85,zz,.18,3.7,'ivory',n=16)
        ivy(side*7.05,3.7,zz,random.uniform(1.5,2.8))
    bench(side*8.35,-18,math.pi/2*side)
    pot(side*8.35,0,-16.1,1.3)
    pot(side*8.35,0,-23.3,1.05)
    # Coral and teal courtyard textile under the colonnade.
    box(side*8.45,.017,-20.9,2.1,.018,2.6,'rug',part='paving')
    for zz in [-22,-21.8,-20,-19.8]:box(side*8.45,.029,zz,2.08,.008,.075,'ivory',part='paving')

for side in [-1,1]:
    x=side*7.05
    for xx in [x-1.35,x+1.35]:
        for zz in [-5.55,-9.8]:box(xx,1.55,zz,.19,3.1,.19,'wood')
    for zz in [-5.55,-9.8]:box(x,3.12,zz,3.2,.2,.2,'wood')
    for i in range(15):box(x,3.3,-5.5-i*.305,3.1,.16,.13,'wood_light')
    for xx in [x-1.35,x+1.35]:box(xx,3.13,-7.65,.2,.2,4.65,'wood')
    bench(x,-8.8)
    pot(x+side*1.5,0,-6,1.15)
    for i in range(7):ivy(x+random.uniform(-1.4,1.4),3.33,-5.58,random.uniform(.7,1.6))

for x in [-3.7,3.7]:
    for z in [-6.8,-15.6,-22.9]:lantern(x,z)
for z in [-10.35,-13.68,-20,-23.6]:
    for x in [-1.22,1.22]:
        cylinder(x,.37,z,.145,.74,'limestone',n=8)
        box(x,.79,z,.36,.09,.36,'ivory')
box(2.7,.475,-16.7,1.1,.95,1.1,'limestone')
box(2.7,.99,-16.7,1.22,.09,1.22,'ivory')
for x,z in [(3.6,-8.9),(1.95,-17.1),(-2.7,-23.4)]:pot(x,0,z,.72)

# A quiet sea, distant ridgelines and soft cloud banks supply depth beyond the map.
box(0,-2.7,-30,260,.1,260,'sea',part='background')
for i in range(150):
    x=random.uniform(-70,70);z=random.uniform(-90,30)
    box(x,-2.641,z,random.uniform(.4,3.6),.008,.025,'foam',part='background',yaw=.15)
for side in [-1,1]:
    for i in range(8):
        x=side*(24+i*7);z=-36-i*5+random.uniform(-5,5)
        ellipsoid(x,-1.8,z,random.uniform(5,10),random.uniform(4,10),random.uniform(5,12),'rock' if i<3 else 'distant',n=9,rings=5,part='background')
for x,z,rx,ry in [(-21,-69,16,9),(-3,-82,15,12),(18,-74,17,8),(36,-88,20,14)]:
    ellipsoid(x,-2.6,z,rx,ry,11,'distant',n=11,rings=5,part='background')
for x,y,z,s in [(-24,17,-65,1.2),(22,18,-75,1.5),(-2,23,-105,1.8),(43,13,-55,1.0)]:
    for i in range(6):
        puff=1+math.sin(i*1.7)*.25
        ellipsoid(x+(i-2.5)*s*1.3,y+math.sin(i*1.4)*s*.6,z,2*s*puff,1.2*s*puff,1.5*s,'cloud',n=20,rings=12,part='background')

# Interior: a sunlit travel studio. Door dimensions match the photograph anchors.
REGION='office'
box(0,-.2,2.35,9,.4,13,'limestone')
for ix in range(-5,5):
    for iz in range(14):box(ix*.89+.445,.022,-3.72+iz*.89,.864,.045,.864,random.choice(['tile','tile_warm']),part='paving')
box(4.5,2.6,2.35,.3,5.2,13,'limestone')
box(0,2.6,8.86,9,5.2,.28,'limestone')
for x in [-3.03,3.03]:box(x,2.6,-4.15,3.1,5.2,.3,'limestone')
box(0,4.28,-4.15,3,1.85,.32,'limestone')
box(0,3.37,-4.03,3.03,.16,.43,'ivory')
for x in [-1.49,1.49]:box(x,1.7,-4.03,.16,3.4,.43,'ivory')
box(-4.5,.48,2.35,.32,.96,13,'limestone')
for zz in [-3.9,.2,4.3,8.5]:
    box(-4.5,2.7,zz,.32,3.6,.3,'limestone')
    box(-4.5,1.03,zz+1.7,.54,.13,3.1,'ivory')
    ivy(-4.15,4.8,zz+.2,2.6)
box(-4.5,4.92,2.35,.42,.66,13,'ivory')
for xx in [-3.5,0,3.5]:box(xx,5.1,2.35,1.85,.25,13,'limestone')
for zz in [-3.6,-.7,2.2,5.1,8]:box(0,4.91,zz,9,.2,.17,'wood_light')
box(1.7,1,2.65,2.2,.16,1.25,'wood_light')
for x in [.78,2.62]:
    for z in [2.17,3.13]:box(x,.47,z,.12,.94,.12,'wood')
box(.8,1.1,2.65,.55,.05,.43,'teal',part='detail')
box(2.42,1.11,2.83,.28,.055,.3,'ivory',part='detail',yaw=.14)
box(2.42,1.142,2.83,.23,.009,.25,'tile_blush',part='detail',yaw=.14)
box(0,.051,3.4,4.3,.02,3.6,'rug',part='paving')
for zz in [1.7,1.84,4.95,5.08]:box(0,.067,zz,4.15,.012,.06,'ivory',part='paving')
for xx in [-1.9,1.9]:box(xx,.067,3.4,.07,.012,3.3,'teal',part='paving')
for i in range(24):
    box(-2.1+i*.18,.067,1.54,.014,.012,.24,'ivory',part='paving')
    box(-2.1+i*.18,.067,5.28,.014,.012,.24,'ivory',part='paving')
bench(-2.7,5.4,.15)
for x,z,s in [(-3.7,-2.35,1.2),(3.65,-2.25,1),(-3.7,1.3,1.1),(3.6,7.7,1.4)]:pot(x,0,z,s)
for yy in [1.1,2,2.9]:
    box(4.22,yy,5.2,.44,.12,2.8,'wood_light')
    for j in range(7):box(4.22,yy+.25,4.1+j*.16,.29,.38+random.random()*.12,.1,random.choice(['teal','rug','ivory','wood']),part='detail')
for z in [-1.2,1.4,6.8]:
    box(4.31,2.7,z,.07,1.2,.85,'wood')
    box(4.26,2.7,z,.018,1.02,.68,'teal',part='detail')
    ellipsoid(4.24,2.86,z,.018,.2,.2,'flower_gold',n=16,rings=8,part='detail')
cylinder(0,4.05,3,.58,.3,'ivory',top=.32,n=32)
cylinder(0,4.55,3,.018,.7,'ink',n=8)
cylinder(0,3.89,3,.33,.035,'glow',n=24)

collections={}
for region in ['coast','office']:
    col=bpy.data.collections.new(region.upper());scene.collection.children.link(col);collections[region]=col
for (region,part,mat),(verts,faces) in batches.items():
    data=bpy.data.meshes.new(f'{region}_{part}_{mat}')
    data.from_pydata(verts,[],faces);data.update()
    ob=bpy.data.objects.new(data.name,data);collections[region].objects.link(ob)
    data.materials.append(materials[mat])
    if part=='architecture':
        bevel=ob.modifiers.new('Soft limestone edges','BEVEL');bevel.width=.025;bevel.segments=2
        bevel.limit_method='ANGLE'
    if part=='foliage' or mat=='cloud':
        for p in data.polygons:p.use_smooth=True
    ob['authored_with']='Blender 4.5 / scripts/build-scenery.py'
for region,col in collections.items():
    bpy.ops.object.select_all(action='DESELECT')
    for ob in col.objects:ob.select_set(True)
    bpy.context.view_layer.objects.active=next(iter(col.objects))
    bpy.ops.export_scene.gltf(filepath=str(OUT/f'{region}.glb'),export_format='GLB',use_selection=True,export_apply=True,export_yup=True)

# Keep the Tripo landmarks in the editable Blender master, not duplicated in exports.
placements=[('lighthouse',[-3.5,.02,-20.6],4.9,'height',0),('suitcase',[1.73,1.1,2.62],.82,'height',-.35),('coastal-arch',[0,0,-5.25],3.75,'height',0),('stone-bridge',[0,0,-12.13],4.05,'horizontal',0),('palm-tree',[-5.8,0,-6.9],4.25,'height',.25),('palm-tree',[5.7,0,-8.6],4.25,'height',-.6),('palm-tree',[5.7,0,-20.8],4.25,'height',1.2),('palm-tree',[-5.9,0,-21.8],4.25,'height',-.8),('instant-camera',[2.7,1.035,-16.7],.54,'height',-.8),('beach-umbrella',[-5.15,0,-9],2.65,'height',-.4),('sailboat',[7.6,-2.52,-13],2.25,'height',.7),('postcard-kiosk',[2.85,0,-7.75],2.3,'height',-.7),('seaside-gazebo',[0,0,-22.1],3.75,'height',0)]
tripo=bpy.data.collections.new('TRIPO_LANDMARKS');scene.collection.children.link(tripo)
for name,pos,size,fit,yaw in placements:
    bpy.ops.object.select_all(action='DESELECT')
    bpy.ops.import_scene.gltf(filepath=str(ROOT/f'public/assets/models/{name}.glb'))
    imported=list(bpy.context.selected_objects)
    meshes=[o for o in imported if o.type=='MESH']
    coords=[o.matrix_world@Vector(c) for o in meshes for c in o.bound_box]
    lo=Vector(tuple(min(c[i] for c in coords) for i in range(3)));hi=Vector(tuple(max(c[i] for c in coords) for i in range(3)))
    dims=hi-lo;factor=size/(dims.z if fit=='height' else max(dims.x,dims.y))
    anchor=bpy.data.objects.new(name,None);tripo.objects.link(anchor)
    anchor.location=(pos[0],-pos[2],pos[1]);anchor.rotation_euler.z=yaw
    if name=='stone-bridge' and dims.x>dims.y:anchor.rotation_euler.z+=math.pi/2
    if name=='coastal-arch' and dims.y>dims.x:anchor.rotation_euler.z+=math.pi/2
    for o in imported:
        if o.parent is None:
            o.location=(o.location-Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z)))*factor
            o.scale*=factor;o.parent=anchor
        for col in list(o.users_collection):col.objects.unlink(o)
        tripo.objects.link(o)

world=bpy.data.worlds.new('Azure daylight');scene.world=world;world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(*color('B7DBE4'),1)
world.node_tree.nodes['Background'].inputs[1].default_value=.75
nodes=world.node_tree.nodes;links=world.node_tree.links
camera_sky=nodes.new('ShaderNodeBackground');camera_sky.inputs[0].default_value=(*color('42C4EB'),1);camera_sky.inputs[1].default_value=.8
lightpath=nodes.new('ShaderNodeLightPath');mix=nodes.new('ShaderNodeMixShader')
links.new(lightpath.outputs['Is Camera Ray'],mix.inputs[0]);links.new(nodes['Background'].outputs[0],mix.inputs[1]);links.new(camera_sky.outputs[0],mix.inputs[2]);links.new(mix.outputs[0],nodes['World Output'].inputs[0])
bpy.ops.object.light_add(type='SUN',location=(-8,8,14));sun=bpy.context.object;sun.name='Warm coastal sun';sun.rotation_euler=(.42,-.48,-.5);sun.data.energy=3;sun.data.angle=.1
def camera(name,pos,target,lens):
    bpy.ops.object.camera_add(location=(pos[0],-pos[2],pos[1]));cam=bpy.context.object;cam.name=name
    point=Vector((target[0],-target[2],target[1]));cam.rotation_euler=(point-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=lens;cam.data.clip_end=400
    return cam
cam=camera('Coastal courtyard',[0,2.3,-6.9],[0,1.7,-21],22)
camera('Map overview',[29,30,18],[0,0,-11],40)
camera('Travel studio',[-1,2.1,7],[0,1.8,-3],22)
scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=20;scene.cycles.use_denoising=True
scene.render.resolution_x=1400;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
scene.render.image_settings.file_format='PNG'
scene.render.filepath=str(SOURCE/'coast-preview.png')
scene['design']='White limestone / coral textiles / sage foliage / turquoise sea'
scene['game_coordinates']='Blender (x,y,z) = game (x,-z,y); meters'
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'holiday-coast.blend'))
(OUT/'manifest.json').write_text(json.dumps({'generator':'Blender 4.5','source':'assets/scenes/holiday-coast.blend','layers':['office.glb','coast.glb'],'objects':len(batches)},indent=2),encoding='utf-8')
bpy.ops.render.render(write_still=True)
print('SCENERY_COMPLETE',str(SOURCE/'holiday-coast.blend'))
