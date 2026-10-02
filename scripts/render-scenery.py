"""Render the additional inspection cameras from assets/scenes/holiday-coast.blend."""
import bpy
from pathlib import Path
root=Path(__file__).resolve().parents[1]
scene=bpy.context.scene
scene.cycles.samples=16
for name,file in [('Travel studio','office-preview.png'),('Map overview','map-preview.png')]:
    scene.camera=bpy.data.objects[name]
    scene.render.filepath=str(root/'assets/scenes'/file)
    bpy.ops.render.render(write_still=True)
