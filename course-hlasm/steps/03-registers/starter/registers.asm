*        ------------------------------------------------------------ *
*        REGISTERS - Base register and register equates exercise       *
*        ------------------------------------------------------------ *
REGS     CSECT
         PRINT NOGEN
*
*        TODO 1: Define register equates R0 through R15
*                Pattern: R0       EQU   0
*                         R1       EQU   1
*                         ...
*                         R15      EQU   15
*
*
*        TODO 2: Add BALR R12,0 to load the current PC into R12
*
*
*        TODO 3: Add USING *,R12 immediately after the BALR
*                to tell the assembler R12 is the base register
*
*
         END   REGS
