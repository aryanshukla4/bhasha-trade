import { memo } from 'react'

/**
 * SkyBackground
 *
 * A calming, lightweight animated agricultural sky scene that stays fixed
 * in the background behind the entire Bhasha Trade application.
 *
 * Features:
 * - Peaceful early-morning rural pale sky gradient
 * - Soft diffuse morning sunlight glow
 * - Extremely soft, slow-drifting morning clouds
 * - One tall, elegant rural tree positioned along the right edge/corner
 * - Multi-layered pale green foliage clusters that sway naturally in a soft breeze
 * - Subtle horizon meadow silhouette at the bottom
 * - Pointer-events disabled, zero UI interference
 * - Responsive scaling for mobile devices
 * - Fully respects prefers-reduced-motion
 */
export const SkyBackground = memo(function SkyBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* 1. Base Early-Morning Sky Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#e1f0f7] via-[#eaf4f7] to-[#f3f9f5]" />

      {/* 2. Soft Morning Sunlight Glow */}
      <div
        className="absolute -right-20 -top-24 h-[550px] w-[550px] rounded-full opacity-60 blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(255, 248, 225, 0.85) 0%, rgba(254, 243, 199, 0.45) 35%, rgba(224, 242, 254, 0.2) 65%, transparent 80%)',
        }}
      />
      <div
        className="absolute left-1/4 -top-32 h-[450px] w-[600px] rounded-full opacity-35 blur-3xl"
        style={{
          background:
            'radial-gradient(ellipse, rgba(240, 249, 255, 0.9) 0%, rgba(224, 242, 254, 0.4) 50%, transparent 80%)',
        }}
      />

      {/* 3. Extremely Soft Morning Clouds */}
      <svg
        className="absolute inset-0 h-full w-full opacity-45"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="softCloudGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
            <stop offset="70%" stopColor="#ffffff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#eaf3f8" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="softCloudGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.7" />
            <stop offset="60%" stopColor="#ffffff" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#ebf5f6" stopOpacity="0.0" />
          </linearGradient>
          <filter id="cloudSoftBlur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
        </defs>

        {/* Cloud Layer 1 - High, slow drifting cloud */}
        <g className="agri-cloud-drift-1" filter="url(#cloudSoftBlur)">
          <path
            d="M 120 110 Q 160 70 230 85 Q 300 65 370 95 Q 430 80 480 115 Q 520 150 470 180 Q 400 200 320 190 Q 220 205 150 175 Q 90 155 120 110 Z"
            fill="url(#softCloudGrad1)"
          />
        </g>

        {/* Cloud Layer 2 - Mid-sky gentle wispy cloud */}
        <g className="agri-cloud-drift-2" filter="url(#cloudSoftBlur)">
          <path
            d="M 680 160 Q 740 120 830 135 Q 910 110 990 145 Q 1060 130 1120 170 Q 1160 210 1090 235 Q 990 250 890 240 Q 780 255 710 225 Q 650 205 680 160 Z"
            fill="url(#softCloudGrad2)"
          />
        </g>

        {/* Cloud Layer 3 - Subtle low-sky horizon mist */}
        <g className="agri-cloud-drift-3" filter="url(#cloudSoftBlur)">
          <path
            d="M -50 260 Q 50 220 180 235 Q 300 215 420 245 Q 520 230 600 270 Q 640 310 550 330 Q 420 340 280 335 Q 120 345 30 320 Q -60 300 -50 260 Z"
            fill="url(#softCloudGrad2)"
            opacity="0.6"
          />
        </g>
      </svg>

      {/* 4. Distant Birds Gliding Across Morning Sky */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Main Flock */}
        <g className="agri-flock-fly">
          {/* Lead Bird */}
          <g transform="translate(0, 0)">
            <path
              className="agri-bird-wing"
              d="M -12 3 C -7 -5 -2 -1 0 1 C 2 -1 7 -5 12 3 C 7 0 3 1 0 3 C -3 1 -7 0 -12 3 Z"
              fill="#2d4237"
              opacity="0.55"
            />
          </g>
          {/* Bird 2 - Upper right follower */}
          <g transform="translate(24, -15) scale(0.82)">
            <path
              className="agri-bird-wing-alt"
              d="M -12 3 C -7 -5 -2 -1 0 1 C 2 -1 7 -5 12 3 C 7 0 3 1 0 3 C -3 1 -7 0 -12 3 Z"
              fill="#2d4237"
              opacity="0.5"
            />
          </g>
          {/* Bird 3 - Lower right follower */}
          <g transform="translate(18, 18) scale(0.74)">
            <path
              className="agri-bird-wing"
              d="M -12 3 C -7 -5 -2 -1 0 1 C 2 -1 7 -5 12 3 C 7 0 3 1 0 3 C -3 1 -7 0 -12 3 Z"
              fill="#2d4237"
              opacity="0.45"
            />
          </g>
          {/* Bird 4 - Distant trailing bird */}
          <g transform="translate(42, 6) scale(0.62)">
            <path
              className="agri-bird-wing-alt"
              d="M -12 3 C -7 -5 -2 -1 0 1 C 2 -1 7 -5 12 3 C 7 0 3 1 0 3 C -3 1 -7 0 -12 3 Z"
              fill="#2d4237"
              opacity="0.4"
            />
          </g>
        </g>

        {/* Distant Secondary Pair */}
        <g className="agri-flock-fly-distant">
          <g transform="translate(0, 0) scale(0.55)">
            <path
              className="agri-bird-wing"
              d="M -12 3 C -7 -5 -2 -1 0 1 C 2 -1 7 -5 12 3 C 7 0 3 1 0 3 C -3 1 -7 0 -12 3 Z"
              fill="#2d4237"
              opacity="0.35"
            />
          </g>
          <g transform="translate(18, -10) scale(0.45)">
            <path
              className="agri-bird-wing-alt"
              d="M -12 3 C -7 -5 -2 -1 0 1 C 2 -1 7 -5 12 3 C 7 0 3 1 0 3 C -3 1 -7 0 -12 3 Z"
              fill="#2d4237"
              opacity="0.3"
            />
          </g>
        </g>
      </svg>

      {/* 5. Subtle Horizon / Meadow Silhouette (Bottom Edge) */}
      <svg
        className="absolute bottom-0 left-0 right-0 h-28 w-full sm:h-36 md:h-44 opacity-30"
        viewBox="0 0 1440 200"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="meadowGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#c3dfca" stopOpacity="0.4" />
            <stop offset="60%" stopColor="#b4d7be" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#9fcab0" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="meadowGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#d5ebd9" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#c2e0cb" stopOpacity="0.5" />
          </linearGradient>
        </defs>

        {/* Distant gentle rolling hill */}
        <path
          d="M 0 130 Q 320 85 720 115 T 1440 100 L 1440 200 L 0 200 Z"
          fill="url(#meadowGrad2)"
        />
        {/* Near rolling field contour */}
        <path
          d="M 0 160 Q 360 120 780 145 T 1440 130 L 1440 200 L 0 200 Z"
          fill="url(#meadowGrad1)"
        />
      </svg>

      {/* 5. Tall Elegant Swaying Tree (Positioned at Right Edge / Corner) */}
      <div
        className="absolute -bottom-6 right-0 h-[700px] w-[440px] sm:h-[800px] sm:w-[500px] md:h-[900px] md:w-[560px] lg:h-[1000px] lg:w-[620px] xl:h-[1100px] xl:w-[680px] origin-bottom-right transition-opacity duration-500 opacity-85 sm:opacity-90 lg:opacity-95"
        style={{
          transform: 'translate(3%, 1%)',
        }}
      >
        <svg
          viewBox="0 0 600 1000"
          className="h-full w-full overflow-visible drop-shadow-sm"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Trunk and Bark Gradient */}
            <linearGradient id="treeTrunkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#382e2b" />
              <stop offset="45%" stopColor="#53433c" />
              <stop offset="75%" stopColor="#67544b" />
              <stop offset="100%" stopColor="#3e312a" />
            </linearGradient>

            <linearGradient id="branchGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4a3b34" />
              <stop offset="100%" stopColor="#5e4c43" />
            </linearGradient>

            {/* Natural Foliage Shading Gradients */}
            <radialGradient id="foliageDeep" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#679774" />
              <stop offset="65%" stopColor="#487255" />
              <stop offset="100%" stopColor="#35563f" />
            </radialGradient>

            <radialGradient id="foliageMid" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#8dbd98" />
              <stop offset="50%" stopColor="#6ca079" />
              <stop offset="100%" stopColor="#4c7759" />
            </radialGradient>

            <radialGradient id="foliageSun" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#b6e0bf" />
              <stop offset="45%" stopColor="#8fbe9a" />
              <stop offset="85%" stopColor="#689a74" />
              <stop offset="100%" stopColor="#4f7a5b" />
            </radialGradient>

            <radialGradient id="foliageSoftLight" cx="30%" cy="25%" r="75%">
              <stop offset="0%" stopColor="#caebd1" />
              <stop offset="40%" stopColor="#9cc9a6" />
              <stop offset="80%" stopColor="#76a682" />
              <stop offset="100%" stopColor="#557f60" />
            </radialGradient>

            {/* Subtle Grass Gradient at base */}
            <linearGradient id="grassBaseGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#7ba987" />
              <stop offset="100%" stopColor="#4e785a" />
            </linearGradient>
          </defs>

          {/* TREE ROOT & WHOLE-TREE BASE SWAY CONTAINER */}
          <g className="agri-tree-main-sway" style={{ transformOrigin: '480px 980px' }}>
            {/* Base Grass Tufts & Soil Mound */}
            <path
              d="M 390 990 Q 480 965 570 990 L 600 1000 L 350 1000 Z"
              fill="#527d5e"
              opacity="0.75"
            />
            {/* Delicate grass blades at base */}
            <path
              d="M 420 985 Q 410 945 395 930 Q 415 950 425 985 Z"
              fill="url(#grassBaseGrad)"
            />
            <path
              d="M 435 985 Q 430 935 415 915 Q 435 940 440 985 Z"
              fill="url(#grassBaseGrad)"
            />
            <path
              d="M 450 985 Q 460 930 475 910 Q 465 945 455 985 Z"
              fill="url(#grassBaseGrad)"
            />
            <path
              d="M 520 985 Q 545 935 565 920 Q 545 950 530 985 Z"
              fill="url(#grassBaseGrad)"
            />

            {/* MAIN ELEGANT TRUNK */}
            {/* Graceful curve sweeping up from right edge toward left and upward */}
            <path
              d="M 460 990 
                 C 465 900, 455 810, 440 730 
                 C 425 650, 395 570, 370 490 
                 C 350 430, 335 370, 330 300 
                 C 328 260, 332 210, 340 160
                 C 344 205, 346 250, 350 300
                 C 362 380, 385 450, 412 530
                 C 442 620, 480 710, 500 810
                 C 515 885, 520 945, 525 990 
                 Z"
              fill="url(#treeTrunkGrad)"
            />

            {/* Trunk shading and bark accent lines */}
            <path
              d="M 452 880 C 440 800, 420 720, 396 640 C 378 580, 362 515, 348 440"
              stroke="#2c221e"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
              opacity="0.4"
            />
            <path
              d="M 480 850 C 468 770, 446 685, 425 605 C 408 545, 390 480, 375 410"
              stroke="#7a655b"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
              opacity="0.3"
            />

            {/* ========================================================
                BRANCH 1: LOWER-LEFT EXTENDING BOUGH (Large Graceful Arch)
               ======================================================== */}
            <g className="agri-branch-sway-1" style={{ transformOrigin: '390px 580px' }}>
              {/* Branch Wood Limb */}
              <path
                d="M 390 580 
                   C 340 550, 270 525, 200 515 
                   C 145 507, 95 512, 50 530
                   C 90 518, 140 515, 195 522
                   C 260 532, 325 558, 375 595 Z"
                fill="url(#branchGrad)"
              />
              <path
                d="M 230 520 C 190 475, 145 450, 95 440 C 135 452, 175 475, 215 522 Z"
                fill="url(#branchGrad)"
              />

              {/* Foliage Clusters on Branch 1 */}
              {/* Deep Background Shading Layer */}
              <ellipse cx="65" cy="520" rx="55" ry="32" fill="url(#foliageDeep)" opacity="0.9" />
              <ellipse cx="140" cy="505" rx="68" ry="38" fill="url(#foliageDeep)" opacity="0.85" />
              <ellipse cx="100" cy="445" rx="52" ry="30" fill="url(#foliageDeep)" opacity="0.85" />
              <ellipse cx="220" cy="505" rx="60" ry="34" fill="url(#foliageDeep)" opacity="0.8" />

              {/* Mid Layer Leaf Masses */}
              <g className="agri-leaf-flutter-1" style={{ transformOrigin: '120px 500px' }}>
                <path
                  d="M 30 515 Q 45 475 90 480 Q 135 465 170 490 Q 195 475 230 495 Q 260 525 235 550 Q 190 565 145 555 Q 95 565 50 545 Z"
                  fill="url(#foliageMid)"
                />
                <path
                  d="M 70 445 Q 95 415 130 425 Q 160 415 180 440 Q 185 470 155 480 Q 120 485 90 475 Z"
                  fill="url(#foliageMid)"
                />
              </g>

              {/* Sunlight Highlight Clusters */}
              <g className="agri-leaf-flutter-2" style={{ transformOrigin: '140px 490px' }}>
                <ellipse cx="80" cy="495" rx="38" ry="22" fill="url(#foliageSun)" opacity="0.95" />
                <ellipse cx="150" cy="485" rx="46" ry="25" fill="url(#foliageSoftLight)" opacity="0.95" />
                <ellipse cx="115" cy="435" rx="34" ry="18" fill="url(#foliageSun)" opacity="0.9" />
                <ellipse cx="210" cy="490" rx="36" ry="20" fill="url(#foliageSoftLight)" opacity="0.85" />

                {/* Delicate hanging leaf fronds */}
                <path
                  d="M 50 535 Q 40 565 30 580 Q 42 565 58 545 Z"
                  fill="#74a682"
                />
                <path
                  d="M 95 550 Q 90 585 80 605 Q 96 580 108 555 Z"
                  fill="#8dbd98"
                />
                <path
                  d="M 160 545 Q 165 580 175 600 Q 170 575 170 545 Z"
                  fill="#6da079"
                />
              </g>
            </g>

            {/* ========================================================
                BRANCH 2: MID-LEFT SPREADING CANOPY
               ======================================================== */}
            <g className="agri-branch-sway-2" style={{ transformOrigin: '350px 420px' }}>
              {/* Branch Wood Limb */}
              <path
                d="M 350 420 
                   C 290 380, 220 350, 140 335 
                   C 95 328, 50 330, 15 340
                   C 55 330, 100 328, 145 335
                   C 215 348, 280 375, 335 410 Z"
                fill="url(#branchGrad)"
              />
              <path
                d="M 180 340 C 140 295, 95 270, 45 255 C 90 270, 130 295, 168 340 Z"
                fill="url(#branchGrad)"
              />

              {/* Foliage Clusters on Branch 2 */}
              <ellipse cx="35" cy="335" rx="50" ry="28" fill="url(#foliageDeep)" opacity="0.85" />
              <ellipse cx="110" cy="320" rx="65" ry="36" fill="url(#foliageDeep)" opacity="0.85" />
              <ellipse cx="65" cy="260" rx="48" ry="28" fill="url(#foliageDeep)" opacity="0.8" />
              <ellipse cx="190" cy="325" rx="62" ry="34" fill="url(#foliageDeep)" opacity="0.8" />

              <g className="agri-leaf-flutter-3" style={{ transformOrigin: '110px 310px' }}>
                <path
                  d="M 10 330 Q 30 290 75 295 Q 120 280 160 305 Q 195 290 230 315 Q 245 345 210 365 Q 160 375 115 365 Q 65 375 20 355 Z"
                  fill="url(#foliageMid)"
                />
                <path
                  d="M 40 260 Q 65 230 100 240 Q 130 230 150 255 Q 155 285 125 295 Q 90 300 60 290 Z"
                  fill="url(#foliageMid)"
                />
              </g>

              {/* Bright Leaf Cluster Highlights */}
              <g className="agri-leaf-flutter-1" style={{ transformOrigin: '120px 300px' }}>
                <ellipse cx="55" cy="315" rx="36" ry="20" fill="url(#foliageSun)" opacity="0.95" />
                <ellipse cx="125" cy="300" rx="48" ry="26" fill="url(#foliageSoftLight)" opacity="0.95" />
                <ellipse cx="80" cy="245" rx="35" ry="19" fill="url(#foliageSoftLight)" opacity="0.9" />
                <ellipse cx="180" cy="305" rx="42" ry="22" fill="url(#foliageSun)" opacity="0.9" />

                {/* Leaf Frond details */}
                <path
                  d="M 25 350 Q 15 385 5 405 Q 20 380 35 358 Z"
                  fill="#74a682"
                />
                <path
                  d="M 85 360 Q 80 395 72 415 Q 88 390 98 365 Z"
                  fill="#8dbd98"
                />
                <path
                  d="M 145 358 Q 150 390 160 410 Q 155 385 152 358 Z"
                  fill="#6da079"
                />
              </g>
            </g>

            {/* ========================================================
                BRANCH 3: UPPER-LEFT ARCHING BOUGH
               ======================================================== */}
            <g className="agri-branch-sway-3" style={{ transformOrigin: '330px 280px' }}>
              <path
                d="M 330 280 
                   C 280 230, 210 190, 130 165 
                   C 85 150, 40 148, 5 155
                   C 45 148, 90 150, 135 165
                   C 205 188, 270 225, 320 270 Z"
                fill="url(#branchGrad)"
              />
              <path
                d="M 170 170 C 130 120, 85 90, 30 75 C 80 90, 120 120, 158 170 Z"
                fill="url(#branchGrad)"
              />

              {/* Foliage Clusters on Branch 3 */}
              <ellipse cx="25" cy="155" rx="46" ry="26" fill="url(#foliageDeep)" opacity="0.85" />
              <ellipse cx="95" cy="145" rx="60" ry="34" fill="url(#foliageDeep)" opacity="0.85" />
              <ellipse cx="50" cy="80" rx="45" ry="26" fill="url(#foliageDeep)" opacity="0.8" />
              <ellipse cx="175" cy="150" rx="58" ry="32" fill="url(#foliageDeep)" opacity="0.8" />

              <g className="agri-leaf-flutter-2" style={{ transformOrigin: '95px 135px' }}>
                <path
                  d="M 5 150 Q 25 110 70 115 Q 110 100 150 125 Q 185 110 220 135 Q 230 165 195 185 Q 145 195 105 185 Q 55 195 15 175 Z"
                  fill="url(#foliageMid)"
                />
                <path
                  d="M 25 80 Q 50 50 85 60 Q 115 50 135 75 Q 140 105 110 115 Q 75 120 45 110 Z"
                  fill="url(#foliageMid)"
                />
              </g>

              <g className="agri-leaf-flutter-3" style={{ transformOrigin: '105px 125px' }}>
                <ellipse cx="45" cy="135" rx="34" ry="19" fill="url(#foliageSun)" opacity="0.95" />
                <ellipse cx="110" cy="120" rx="45" ry="24" fill="url(#foliageSoftLight)" opacity="0.95" />
                <ellipse cx="65" cy="68" rx="32" ry="18" fill="url(#foliageSoftLight)" opacity="0.9" />
                <ellipse cx="165" cy="130" rx="40" ry="22" fill="url(#foliageSun)" opacity="0.9" />

                <path
                  d="M 15 170 Q 5 200 -2 220 Q 10 195 24 175 Z"
                  fill="#74a682"
                />
                <path
                  d="M 75 180 Q 70 215 62 235 Q 78 210 88 185 Z"
                  fill="#8dbd98"
                />
              </g>
            </g>

            {/* ========================================================
                BRANCH 4: CROWN TOP CANOPY (Reaching High & Gracefully)
               ======================================================== */}
            <g className="agri-branch-sway-4" style={{ transformOrigin: '340px 180px' }}>
              {/* Crown Center & Right Branch Stems */}
              <path
                d="M 340 180 
                   C 310 120, 260 70, 190 35 
                   C 145 15, 100 8, 60 10
                   C 105 8, 150 15, 195 38
                   C 255 70, 300 120, 330 175 Z"
                fill="url(#branchGrad)"
              />
              <path
                d="M 345 170 
                   C 380 110, 430 65, 490 35 
                   C 525 20, 560 12, 595 10
                   C 555 12, 520 20, 485 35
                   C 425 65, 375 110, 342 165 Z"
                fill="url(#branchGrad)"
              />
              <path
                d="M 335 150 C 330 90, 310 40, 270 5 C 305 40, 320 90, 328 145 Z"
                fill="url(#branchGrad)"
              />

              {/* Crown Foliage Masses */}
              <ellipse cx="80" cy="20" rx="55" ry="30" fill="url(#foliageDeep)" opacity="0.85" />
              <ellipse cx="170" cy="25" rx="65" ry="36" fill="url(#foliageDeep)" opacity="0.85" />
              <ellipse cx="270" cy="18" rx="60" ry="34" fill="url(#foliageDeep)" opacity="0.85" />
              <ellipse cx="370" cy="25" rx="65" ry="36" fill="url(#foliageDeep)" opacity="0.85" />
              <ellipse cx="470" cy="28" rx="60" ry="34" fill="url(#foliageDeep)" opacity="0.85" />
              <ellipse cx="550" cy="25" rx="50" ry="28" fill="url(#foliageDeep)" opacity="0.8" />

              <g className="agri-leaf-flutter-1" style={{ transformOrigin: '300px 30px' }}>
                <path
                  d="M 50 20 Q 80 -15 135 -5 Q 185 -25 240 -5 Q 295 -30 355 -10 Q 415 -25 470 0 Q 525 -15 570 15 Q 585 45 545 65 Q 480 80 410 70 Q 330 85 260 70 Q 180 85 110 65 Q 50 65 35 35 Z"
                  fill="url(#foliageMid)"
                />
              </g>

              {/* Brightest Morning Sunlight Highlights on Crown */}
              <g className="agri-leaf-flutter-2" style={{ transformOrigin: '320px 20px' }}>
                <ellipse cx="105" cy="12" rx="42" ry="22" fill="url(#foliageSoftLight)" opacity="0.95" />
                <ellipse cx="195" cy="15" rx="48" ry="25" fill="url(#foliageSun)" opacity="0.95" />
                <ellipse cx="290" cy="8" rx="46" ry="24" fill="url(#foliageSoftLight)" opacity="0.95" />
                <ellipse cx="385" cy="15" rx="50" ry="26" fill="url(#foliageSun)" opacity="0.95" />
                <ellipse cx="485" cy="18" rx="46" ry="24" fill="url(#foliageSoftLight)" opacity="0.95" />
                <ellipse cx="545" cy="18" rx="38" ry="20" fill="url(#foliageSun)" opacity="0.9" />

                {/* Delicate hanging leaf fronds from crown */}
                <path
                  d="M 120 48 Q 115 80 108 100 Q 124 78 132 52 Z"
                  fill="#74a682"
                />
                <path
                  d="M 230 55 Q 225 90 215 112 Q 232 88 244 60 Z"
                  fill="#8dbd98"
                />
                <path
                  d="M 350 55 Q 355 88 365 110 Q 360 85 358 55 Z"
                  fill="#8dbd98"
                />
                <path
                  d="M 460 52 Q 465 85 475 105 Q 470 80 468 52 Z"
                  fill="#6da079"
                />
              </g>
            </g>

            {/* ========================================================
                BRANCH 5: RIGHT-EDGE SIDE CANOPY
               ======================================================== */}
            <g className="agri-branch-sway-2" style={{ transformOrigin: '400px 380px' }}>
              <path
                d="M 400 380 
                   C 445 350, 495 330, 550 315 
                   C 575 310, 595 312, 610 318
                   C 590 312, 570 310, 545 316
                   C 490 332, 440 355, 395 388 Z"
                fill="url(#branchGrad)"
              />
              {/* Foliage Masses on Right Edge */}
              <ellipse cx="480" cy="320" rx="55" ry="32" fill="url(#foliageDeep)" opacity="0.85" />
              <ellipse cx="550" cy="310" rx="50" ry="28" fill="url(#foliageDeep)" opacity="0.85" />

              <g className="agri-leaf-flutter-3" style={{ transformOrigin: '500px 310px' }}>
                <path
                  d="M 430 325 Q 460 290 510 295 Q 555 285 590 310 Q 600 340 570 355 Q 520 365 475 355 Q 440 355 430 325 Z"
                  fill="url(#foliageMid)"
                />
              </g>

              <g className="agri-leaf-flutter-1" style={{ transformOrigin: '510px 305px' }}>
                <ellipse cx="475" cy="305" rx="38" ry="20" fill="url(#foliageSun)" opacity="0.95" />
                <ellipse cx="545" cy="298" rx="36" ry="19" fill="url(#foliageSoftLight)" opacity="0.95" />

                <path
                  d="M 490 345 Q 495 375 505 395 Q 500 370 498 345 Z"
                  fill="#74a682"
                />
                <path
                  d="M 550 335 Q 555 365 565 385 Q 560 360 558 335 Z"
                  fill="#8dbd98"
                />
              </g>
            </g>
          </g>
        </svg>
      </div>
    </div>
  )
})
