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
MSG      DC    C'Hello, HLASM'   Character constant (12 bytes)
MSGLEN   EQU   *-MSG             Length of MSG computed at assembly time
COUNTER  DS    F                 Fullword working storage (4 bytes)
BUFFER   DS    CL80              80-byte character output buffer
*
DATAEND  DS    0H
         END   DATA
