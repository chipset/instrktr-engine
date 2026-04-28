# Generate, Validate, and Execute Easytrieve Programs

This use case demonstrates how to modernize mainframe development by using Code4z extensions to generate, validate, and execute Easytrieve programs directly within VS Code.

| Code4z extensions: Easytrieve Language Support, JCL Language Support, Zowe Explorer |
| :---- |
|  |

The Easytrieve Language Support extension integrates mainframe development into modern IDE workflows and enables early-stage testing and validation. The extension replaces manual legacy processes with a seamless framework that eliminates repetitive tasks and accelerates development. The modern day developer, relatively new to the mainframe, can now work with mainframe applications with familiar, open-source tooling.

While the extension provides the intelligence to write better code, it also serves as an operational bridge to the mainframe. Easytrieve Language Support automates the generation of the JCL files that are required to execute programs. The extension then uploads the files to the mainframe so that you can submit the job in Zowe Explorer. This integration allows you to monitor execution status and view resulting spool output instantly within your IDE. Also, the extension enhances code intelligence through macro integration. It retrieves Easytrieve macros from the mainframe using a Zowe profile and stores them locally, enabling the editor to recognize and validate symbols that are defined within those macros as you work.

## **Prerequisites**

Before you generate the JCL files, ensure that you address the following requirements:

1. Set up a Zowe profile that enables communication between VS Code and the mainframe. For more information about how to set up a Zowe profile, see Zowe Explorer Profiles.  
2. Configure the Easytrieve Language Support settings which you will use to upload the JCL for the Easytrieve program execution. For more information, see Easytrieve Language Support.

To upload a JCL file and submit the job in Zowe Explorer, perform the following steps:

1. Open your Easytrieve source file in VS Code.  
   This example shows a dummy Hello World Easytrieve program:  
   `DEFINE WDUMMY W 82 A VARYING VALUE ''                                          JOB INPUT NULL`                                                                   
   `DISPLAY 'HELLO WORLD'`                                                            
   `STOP`   
2. Make changes to the code with the help of the following features:  
   1. **Review Syntax and Diagnostics**: Identifies coding errors in real time through **Syntax coloring** and diagnostic markers to ensure code integrity as you type.  
   2. **Inspect Symbols and Keywords**: Provides instant field definitions via Hover and suggests valid keywords through **Autocomplete** to reduce manual entry errors.  
   3. **Verify Program Logic**: Enables instant navigation between variables and macros using **Go to Definition** to confirm all references are correctly defined across the codebase.  
3. To generate the JCL, right-click on the Easytrieve program file and select **generate JCL**.  
   This example shows how a JCL file is generated with the same name as the Easytrieve program with the extension .jcl:  
   `//JOB01EZT JOB (123456789),'EZTPRGMR'`  
   `//COMPGO EXEC PGM=EZTPA00`  
   `//STEPLIB DD DISP=SHR,DSN=Your.EZT.Load.Library`  
   `//EZTVFM DD UNIT=SYSDA,`  
   `//          SPACE=(4096,(1000,1000))`  
   `//EZOPTBL DD DISP=SHR,DSN=Your.EZT.Option.Library`  
   `//SYSPRINT DD SYSOUT=*`  
   `//SYSOUT DD SYSOUT=*`  
   `//SYSIN DD *`  
   `DEFINE WDUMMY W 82 A VARYING VALUE ''`  
   `JOB INPUT NULL`  
   `DISPLAY 'HELLO WORLD'`  
   `STOP`  
4. Validate the JCL output with JCL Language Support to ensure that all job statements, dataset definitions, and parameters are syntactically correct and properly aligned before submission.  
5. To upload your EZT and JCL files to the mainframe, right-click on the Easytrieve program file and select **Upload EZT to Mainframe**.  
   The EZT file is uploaded to the data set provided in the *eztdsn* setting, and the JCL file is uploaded to the data set provided in the *jcldsn* setting.  
6. To submit the job:  
   1. Right-click the JCL member name in the Zowe Explorer tree and select **Submit Job**, or:  
   2. Right-click the JCL file and select **Submit Job** in the Easytrieve Language Support extension.

             A notification appears at the bottom right with the Job ID. Click the **Job ID** to jump directly to the spool.

7. Verify the output to ensure your Easytrieve code executed successfully:  
   1. Go to the **Jobs** section in the Zowe Explorer side panel.  
   2. Search for your **Job ID** or filter by your username.  
   3. Expand the job entry to see the different output DDs.  
   4. Open the job output in a new VS Code tab.

   The job displays a "0000" completion code and your report opens in a new VS Code tab.

You generated, validated, and executed your Easytrieve program on the mainframe using Easytrieve Language Support, JCL Language Support, and Zowe Explorer.

## **Next Step**

Once you establish this basic workflow, the next step is to organize your Easytrieve source and JCL into structured projects to better maintain and scale your mainframe applications directly from VS Code.

