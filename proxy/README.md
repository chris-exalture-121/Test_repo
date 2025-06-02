# Google Drive Asset Proxy

Deployments are currently done by pushing an image to ECR, which triggers an App Runner build automatically.

AWS account: ecosystem-app-google-drive
AWS role: ecosystem-partner-exalture

To avoid breaking prod, you may consider making a new AppRunner instance for deploys to test.
To do this, replace all instances of google-drive-proxy below with your new name.

## Instructions

Push code to `main` branch in Git

Then there's an automatic rebuild in App Runner [here](https://us-east-1.console.aws.amazon.com/apprunner/home?region=us-east-1#/services).

## Instructions for deploying to a new AWS account

The proxy depends on a KMS key with alias `asset-proxy`, which is a `SYMMETRIC_DEFAULT` key on KMS.
If you want to spin this proxy up on a new AWS account, you will need to add this new key, and allow the 
instance role for the AppRunner instance to to access it.

The AppRunner instance role will also need to be able to encrypt and decrypt using KMS keys.

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": [
                "kms:Decrypt",
                "kms:Encrypt",
                "kms:DescribeKey",
                "kms:Verify",
                "kms:Sign"
            ],
            "Resource": "*"
        }
    ]
}
```
