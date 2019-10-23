#!/bin/bash

BLOCKS=$(/home/rynom/.config/particl-desktop/testnet/particld/unpacked/particl-0.18.1.0/bin/particl-cli getblockcount)

COMPLETE=()
ONGOING=()
ONGOINGCOUNT=0
COMPLETECOUNT=0
for (( i=506400; i<=${BLOCKS}; i++ ))
do
    BLOCK=$(/home/rynom/.config/particl-desktop/testnet/particld/unpacked/particl-0.18.1.0/bin/particl-cli getblock $(/home/rynom/.config/particl-desktop/testnet/particld/unpacked/particl-0.18.1.0/bin/particl-cli getblockhash $i))

    TXS=`echo $BLOCK | jq -r .tx[]`
    for tx in $TXS
    do
          #echo $tx
        RAW=$(/home/rynom/.config/particl-desktop/testnet/particld/unpacked/particl-0.18.1.0/bin/particl-cli getrawtransaction $tx|grep a0000000000002|grep 00000000ffffffff030403)
        if [[ $RAW ]]
        then
            FLIPPED=$(echo $tx|fold -w2|tac|tr -d "\n")
            # echo $tx $FLIPPED

            FINALIZED=$(echo $RAW|grep 1976a914)
            NEWESCROW=$(echo $RAW|grep 17a914)
            BLOCKNO=$(echo $BLOCK|jq -r .height)
            if [[ $NEWESCROW ]]
            then

              echo "Block: $BLOCKNO - newescrow yay: $tx ~ $FLIPPED"
              ONGOING+=($FLIPPED)
              ONGOINGCOUNT=$((ONGOINGCOUNT + 1))
            else
                echo "Block: $BLOCKNO - finalized:" 1 $tx 2 $FLIPPED 3 ${ONGOING[*]}
                for escrow in ${ONGOING[*]}
                do
	            # echo "huh? - $FINALIZED - $escrow"
                    if [[ $FINALIZED == *"$escrow"* ]]
                    then
                        echo "COMPLETED $escrow"
                        COMPLETE+=($(echo $escrow|fold -w2|tac|tr -d "\n"))
                        ONGOINGCOUNT=$((ONGOINGCOUNT - 1))
                        COMPLETECOUNT=$((COMPLETECOUNT + 1))
                        ONGOING=("${ONGOING[*]/$escrow}")
                    else
                        echo "ONGOING $escrow ${#ONGOING[@]} $ONGOINGCOUNT"
                    fi
                done
            fi
        fi
    done
done

echo
echo "COMPLETE:" ${COMPLETE[*]} $COMPLETECOUNT
echo
echo
echo "ONGOING:" ${ONGOING[*]} $ONGOINGCOUNT