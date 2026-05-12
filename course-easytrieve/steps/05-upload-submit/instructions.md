# Upload Targets and Submitting the Job

The Easytrieve extension can upload your **Easytrieve source** and **JCL** to partitioned data sets on the host. Two settings name those targets:

| Setting | Purpose |
|---------|---------|
| **`eztdsn`** | Library (PDS/PDSE) that receives the `.ezt` member |
| **`jcldsn`** | Library that receives the generated or edited JCL member |

From the VS Code context menu on your Easytrieve file you choose **Upload EZT to Mainframe**. After upload, you submit the job either from **Zowe Explorer** (right-click the JCL member → **Submit Job**) or from the extension menu on the JCL file.

## The exercise

Open [upload-flow.md](open:upload-flow.md). Replace the `TODO` markers:

1. Write example values for **`eztdsn`** and **`jcldsn`** using a qualified PDS name your organization might use (they can be fictional, but not the substring `TODO`).
2. Summarize the upload menu action (name it exactly: **Upload EZT to Mainframe**).
3. Name two ways to **Submit Job** described in the original workflow (Zowe Explorer on the JCL member, and the Easytrieve extension on the JCL file).

Click **Check My Work** when no `TODO` remains.
