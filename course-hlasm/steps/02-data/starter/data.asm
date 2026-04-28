*        ------------------------------------------------------------ *
*        DATA     - Data definitions exercise                          *
*        ------------------------------------------------------------ *
DATA     CSECT
         PRINT NOGEN
R12      EQU   12
         BALR  R12,0
         USING *,R12
*
*        ---- Code section ----
         B     DATAEND           Branch past the data area
*
*        ---- Data section ----
*
*        TODO 1: Define a character constant named MSG containing 'Hello, HLASM'
*                Example: MSG      DC    C'your text here'
*
*
*        TODO 2: Compute the length of MSG using EQU
*                Example: MSGLEN   EQU   *-MSG
*
*
*        TODO 3: Define a fullword storage area named COUNTER
*                Example: COUNTER  DS    F
*
*
*        TODO 4: Define an 80-byte character buffer named BUFFER
*                Example: BUFFER   DS    CL80
*
*
DATAEND  DS    0H
         END   DATA
