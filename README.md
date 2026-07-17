<!-- STEP 1: The Outer Wrapper (Maintains your background color and padding) -->
<div style="background-color: #94BB86; padding: 40px; font-family: sans-serif; color: #333; line-height: 1.6; border-radius: 10px;">

  <!-- STEP 2: The Side-by-Side Flex Container -->
  <!-- This container holds the image and the header/about text horizontally.
       'flex-wrap: wrap' ensures it collapses vertically on mobile devices. -->
  <div style="display: flex; align-items: center; gap: 30px; flex-wrap: wrap; margin-bottom: 30px;">

    <!-- STEP 3: The Left-Aligned Image -->
    <!-- Make sure 'profile.jpg' matches your actual filename. -->
    <img src="WebsiteHeadshot.png" alt="[Matt Radosevich] Profile Picture" width="180" height="180" style="border-radius: 50%; border: 4px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.1); flex-shrink: 0;">

    <!-- STEP 4: The Right-Aligned Text Block (Name, Title, About Me) -->
    <!-- 'flex: 1' allows this text block to fill the remaining space. -->
    <div style="flex: 1; min-width: 280px;">
      <h1 style="margin-top: 0; font-size: 2.5rem; color: #2c3e50;">Matt Radosevich</h1>
      <p style="font-size: 1.2rem; margin-bottom: 5px;"><strong>Ph.D. Candidate in Mathematics</strong></p>
      <p style="margin-top: 0; color: #7f8c8d;"><em>Rice University</em></p>
      <p><a href="mailto:your.email@university.edu">your.email@university.edu</a> | <a href="https://github.com/MattRadosevich">GitHub Profile</a></p>

      <h2 style="margin-top: 25px; border-bottom: 2px solid #ddd; padding-bottom: 10px;">About Me</h2>
      <p>Bio here.</p>
    </div>

  </div> <!-- End of Side-by-Side Flex Container -->

  <!-- STEP 5: The Rest of Your Content (Standard Markdown) -->
  <!-- This content flows normally below the side-by-side section. -->

  ### Research Interests
  * Add here

  ### Teaching
  * **Fall 2026:** 
  * **Spring 2026:** 

  ### Software & Code
  My code lives on my [GitHub profile](https://github.com/MattRadosevich.

</div> <!-- End of Outer Wrapper -->