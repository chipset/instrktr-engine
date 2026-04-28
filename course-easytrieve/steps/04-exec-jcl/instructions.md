# JCL to Execute Easytrieve

When you **Generate JCL** from the extension, it produces a job stream that invokes the Easytrieve driver program and supplies your source on **SYSIN**.

## Typical structure

Your job should include:

- A **JOB** statement (accounting and name vary by site).
- An **EXEC** that runs program **`EZTPA00`** (the Easytrieve executor at many shops — use the same name your administrator provides if different).
- **`//STEPLIB`** — load library for Easytrieve.
- **`//EZTVFM`** — work space DD (often a VSAM or sequential work file as defined locally).
- **`//EZOPTBL`** — options table library.
- **`//SYSPRINT`** and **`//SYSOUT`** — listing and message output.
- **`//SYSIN DD *`** — inline Easytrieve source (same statements as your `.ezt` file).

Dataset names in the sample use placeholders such as `YOUR.EZT.LOAD.LIBRARY` — replace with values valid on your system when you run for real.

## The exercise

Open [hello.jcl](open:hello.jcl). Replace the `TODO` markers with real-looking dataset names (they can still be placeholders, but not the literal word `TODO`). Ensure:

1. Every JCL line you author begins with `//` (continuation lines may use only `//` in columns 1–2 then blanks as usual).
2. **`EZTPA00`** appears on the EXEC.
3. DD names **`STEPLIB`**, **`EZTVFM`**, **`EZOPTBL`**, **`SYSPRINT`**, **`SYSOUT`**, and **`SYSIN`** each appear at least once.
4. The **`SYSIN`** stream includes your four Easytrieve statements (`DEFINE` … `STOP`).

Click **Check My Work** when done.
