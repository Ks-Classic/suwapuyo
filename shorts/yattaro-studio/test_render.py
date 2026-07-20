import importlib.util
import sys
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("render.py")
SPEC = importlib.util.spec_from_file_location("yattaro_render", MODULE_PATH)
assert SPEC and SPEC.loader
renderer = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = renderer
SPEC.loader.exec_module(renderer)


class RendererTest(unittest.TestCase):
    def test_interpolate_halfway(self):
        motions = [
            renderer.Motion(0, 0.2, 0.4, 0.5, -10),
            renderer.Motion(2, 0.8, 0.6, 0.7, 10),
        ]
        value = renderer.interpolate(motions, 1)
        self.assertAlmostEqual(value.x, 0.5)
        self.assertAlmostEqual(value.y, 0.5)
        self.assertAlmostEqual(value.scale, 0.6)
        self.assertAlmostEqual(value.rotation, 0)

    def test_validate_rejects_out_of_range_motion(self):
        issues = renderer.validate({
            "title": "bad",
            "duration": 2,
            "fps": 30,
            "motions": [{"at": 0, "x": 2, "y": 0.5, "scale": 0.5, "rotation": 0}],
        })
        self.assertTrue(any("x/y" in issue for issue in issues))

    def test_edge_white_removal_preserves_enclosed_white(self):
        image = renderer.Image.new("RGB", (7, 7), "white")
        for x in range(1, 6):
            image.putpixel((x, 1), (0, 0, 0))
            image.putpixel((x, 5), (0, 0, 0))
        for y in range(1, 6):
            image.putpixel((1, y), (0, 0, 0))
            image.putpixel((5, y), (0, 0, 0))
        result = renderer.clear_edge_white(image)
        self.assertEqual(result.getpixel((0, 0))[3], 0)
        self.assertEqual(result.getpixel((3, 3))[3], 255)


if __name__ == "__main__":
    unittest.main()
