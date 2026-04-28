//* -----------------------------------------------
//* EMPVAL   - Run Easytrieve employee validation
//* -----------------------------------------------
//*
//* TODO 1: Add a JOB card
//*   Format: //jobname  JOB  (account),'description',CLASS=A,MSGCLASS=X
//*
//*
//* TODO 2: Add EXEC statement to run Easytrieve Plus
//*   //STEP1    EXEC PGM=EZTPA00
//*
//*
//* TODO 3: Add SYSPRINT for report output
//*   //SYSPRINT DD  SYSOUT=*
//*
//*
//* TODO 4: Add DD for the employee input file
//*   //EMPDD    DD  DSN=HR.EMPLOYEE.MASTER,DISP=SHR
//*
//*
//* TODO 5: Add SYSIN with inline Easytrieve source
//*   //SYSIN    DD  *
//*     FILE EMPLOYEE EMPDD
//*     ... (field definitions) ...
//*     W
//*     ... (working storage) ...
//*     P
//*     ... (validation logic) ...
//*   /*
//*
