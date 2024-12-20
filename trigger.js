{
    "Records" [
      {
        "eventID": "1",
        "eventName": "MODIFY",
        "eventVersion": "1.1",
        "eventSource": "aws:dynamodb",
        "awsRegion": "ap-southeast-1",
        "dynamodb": {

// DT + Inst.
          "Keys": {
            "idProduct": {
              "S": "cipro_fluxaxin_ni_ano"
            }
          },
//entireSystemStat
          "NewImage": {
            "idProduct": {
              "S": "150"
            },
            "quantity": {
              "N": "8"
            }
          },
          "OldImage": {
            "idProduct": {
              "S": "149"
            },
            "quantity": {
              "N": "10"
            }
          },
          "SequenceNumber": "4421584500000000017450439091",
          "SizeBytes": 26,
          "StreamViewType": "NEW_AND_OLD_IMAGES"
        },
//notReal
        "eventSourceARN": "arn:aws:dynamodb:ap-southeast-1:344578790346:table/pha_Inventory/stream/2021-12-20T00:00:00.000"
      }
    ]
  }
