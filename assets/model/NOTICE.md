# SpaceTwin anatomical assets

Source atlas: Z-Anatomy — Gauthier Kervyn and contributors, derived in part from BodyParts3D — Kousaku Okubo / The Database Center for Life Science (DBCLS).

- https://github.com/Z-Anatomy/Models-of-human-anatomy
- https://lifesciencedb.jp/bp3d/
- Z-Anatomy license: https://creativecommons.org/licenses/by-sa/4.0/
- Upstream BodyParts3D attribution: CC BY-SA 2.1 Japan, as requested by Z-Anatomy.

GLB files obtained from https://github.com/pernelluvsya/atlas-proto at the commit in SOURCE_COMMIT.txt. That project's original notice is preserved as ATTRIBUTION.md. Only the five system files are used; no additional reproductive or other standalone assets from that repository are included.

Upstream transformations: FBX to GLB, removal of helper meshes, Meshopt compression. SpaceTwin transformations: weld, error-bounded mesh simplification (target 20% triangles; error 0.002), quantization and Meshopt recompression. Runtime materials, transparency and risk colors are replaced. Original atlas structure names and world coordinates are retained. The display centers the atlas by translating Y by -0.9 m; individual organs are not rearranged. Muscle attachment markers and selected envelope surfaces are hidden in the viewer.

All original and modified anatomy model assets in this directory and web/ remain under CC BY-SA 4.0; no exclusive rights are claimed. Preserve attribution and share model adaptations under the same license. See ATTRIBUTION.md for additional upstream details and the upstream Z-Anatomy README for included reference contributions, including Brainder/University of Washington, University of Dundee (cranial nerves/foramina CC BY 4.0; inner-ear CC BY-NC-SA 4.0), and Lissie Cowley kidney reference CC BY-NC 4.0. Because upstream includes these reference notices, this demo does not assert unrestricted commercial clearance for every atlas structure. Review upstream per-structure rights before commercial redistribution.

These models are educational reference anatomy, not astronaut-specific scans. Mesh simplification can remove fine detail. The viewer is not a certified medical device and no clinical anatomical accuracy guarantee is provided. Organ risk colors are experimental system-wide simulation indices; they are not measured organ pathology.
