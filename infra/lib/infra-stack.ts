import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ─── DynamoDB Tables ───────────────────────────────────────────────

    const dossiersTable = new dynamodb.Table(this, 'DossiersTable', {
      tableName: 'Defuse-Dossiers',
      partitionKey: { name: 'dossierId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    dossiersTable.addGlobalSecondaryIndex({
      indexName: 'teacherId-index',
      partitionKey: { name: 'teacherId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });
    dossiersTable.addGlobalSecondaryIndex({
      indexName: 'status-index',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    const evidenceTable = new dynamodb.Table(this, 'EvidenceTable', {
      tableName: 'Defuse-Evidence',
      partitionKey: { name: 'dossierId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'evidenceId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const messagesTable = new dynamodb.Table(this, 'MessagesTable', {
      tableName: 'Defuse-Messages',
      partitionKey: { name: 'dossierChannel', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const helplineTable = new dynamodb.Table(this, 'HelplineTable', {
      tableName: 'Defuse-Helpline',
      partitionKey: { name: 'conversationId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    helplineTable.addGlobalSecondaryIndex({
      indexName: 'linkedDossier-index',
      partitionKey: { name: 'linkedDossierId', type: dynamodb.AttributeType.STRING },
    });

    const auditLogTable = new dynamodb.Table(this, 'AuditLogTable', {
      tableName: 'Defuse-AuditLog',
      partitionKey: { name: 'dossierId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const checklistTable = new dynamodb.Table(this, 'ChecklistTable', {
      tableName: 'Defuse-Checklist',
      partitionKey: { name: 'dossierId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'order', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ─── S3 Buckets ────────────────────────────────────────────────────

    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: `defuse-frontend-${this.account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const evidenceBucket = new s3.Bucket(this, 'EvidenceBucket', {
      bucketName: `defuse-evidence-${this.account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.GET],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
        },
      ],
    });

    // ─── Lambda Functions ──────────────────────────────────────────────

    const lambdaEnvironment = {
      DOSSIERS_TABLE: dossiersTable.tableName,
      EVIDENCE_TABLE: evidenceTable.tableName,
      MESSAGES_TABLE: messagesTable.tableName,
      HELPLINE_TABLE: helplineTable.tableName,
      AUDIT_LOG_TABLE: auditLogTable.tableName,
      CHECKLIST_TABLE: checklistTable.tableName,
      EVIDENCE_BUCKET: evidenceBucket.bucketName,
      BEDROCK_MODEL_ID: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    };

    const dossiersHandler = new lambda.Function(this, 'DossiersHandler', {
      functionName: 'defuse-dossiers',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/dossiers.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/dist')),
      environment: lambdaEnvironment,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    const evidenceHandler = new lambda.Function(this, 'EvidenceHandler', {
      functionName: 'defuse-evidence',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/evidence.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/dist')),
      environment: lambdaEnvironment,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    const messagesHandler = new lambda.Function(this, 'MessagesHandler', {
      functionName: 'defuse-messages',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/messages.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/dist')),
      environment: lambdaEnvironment,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    const checklistHandler = new lambda.Function(this, 'ChecklistHandler', {
      functionName: 'defuse-checklist',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/checklist.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/dist')),
      environment: lambdaEnvironment,
      timeout: cdk.Duration.seconds(60),
      memorySize: 512,
    });

    const helplineHandler = new lambda.Function(this, 'HelplineHandler', {
      functionName: 'defuse-helpline',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/helpline.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/dist')),
      environment: lambdaEnvironment,
      timeout: cdk.Duration.seconds(60),
      memorySize: 512,
    });

    const toneAdaptHandler = new lambda.Function(this, 'ToneAdaptHandler', {
      functionName: 'defuse-tone-adapt',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/tone-adapt.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/dist')),
      environment: lambdaEnvironment,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    const inspectieHandler = new lambda.Function(this, 'InspectieHandler', {
      functionName: 'defuse-inspectie',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/draft-inspectie-report.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/dist')),
      environment: lambdaEnvironment,
      timeout: cdk.Duration.seconds(60),
      memorySize: 512,
    });

    const auditHandler = new lambda.Function(this, 'AuditHandler', {
      functionName: 'defuse-audit',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/audit.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/dist')),
      environment: lambdaEnvironment,
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
    });

    const resourcesHandler = new lambda.Function(this, 'ResourcesHandler', {
      functionName: 'defuse-resources',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/resources.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/dist')),
      environment: lambdaEnvironment,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
    });

    // ─── IAM Permissions ───────────────────────────────────────────────

    const allHandlers = [
      dossiersHandler, evidenceHandler, messagesHandler,
      checklistHandler, helplineHandler, toneAdaptHandler,
      inspectieHandler, auditHandler, resourcesHandler,
    ];

    for (const fn of allHandlers) {
      dossiersTable.grantReadWriteData(fn);
      evidenceTable.grantReadWriteData(fn);
      messagesTable.grantReadWriteData(fn);
      helplineTable.grantReadWriteData(fn);
      auditLogTable.grantReadWriteData(fn);
      checklistTable.grantReadWriteData(fn);
      evidenceBucket.grantReadWrite(fn);

      fn.addToRolePolicy(new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: ['*'],
      }));
    }

    // ─── API Gateway ───────────────────────────────────────────────────

    const api = new apigateway.RestApi(this, 'DefuseApi', {
      restApiName: 'Defuse API',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    // /api/dossiers
    const dossiers = api.root.addResource('api').addResource('dossiers');
    dossiers.addMethod('GET', new apigateway.LambdaIntegration(dossiersHandler));
    dossiers.addMethod('POST', new apigateway.LambdaIntegration(dossiersHandler));
    const dossierId = dossiers.addResource('{dossierId}');
    dossierId.addMethod('GET', new apigateway.LambdaIntegration(dossiersHandler));
    dossierId.addMethod('PUT', new apigateway.LambdaIntegration(dossiersHandler));

    // /api/evidence
    const evidence = api.root.getResource('api')!.addResource('evidence');
    evidence.addResource('upload-url').addMethod('POST', new apigateway.LambdaIntegration(evidenceHandler));
    const evidenceDossier = evidence.addResource('{dossierId}');
    evidenceDossier.addMethod('GET', new apigateway.LambdaIntegration(evidenceHandler));
    evidenceDossier.addMethod('POST', new apigateway.LambdaIntegration(evidenceHandler));

    // /api/messages
    const messages = api.root.getResource('api')!.addResource('messages');
    const messagesDossier = messages.addResource('{dossierId}');
    const messagesChannel = messagesDossier.addResource('{channel}');
    messagesChannel.addMethod('GET', new apigateway.LambdaIntegration(messagesHandler));
    messagesChannel.addMethod('POST', new apigateway.LambdaIntegration(messagesHandler));

    // /api/ai
    const ai = api.root.getResource('api')!.addResource('ai');
    ai.addResource('checklist').addMethod('POST', new apigateway.LambdaIntegration(checklistHandler));
    const helpline = ai.addResource('helpline');
    helpline.addResource('chat').addMethod('POST', new apigateway.LambdaIntegration(helplineHandler));
    ai.addResource('tone-adapt').addMethod('POST', new apigateway.LambdaIntegration(toneAdaptHandler));
    ai.addResource('draft-inspectie-report').addMethod('POST', new apigateway.LambdaIntegration(inspectieHandler));

    // /api/resources
    api.root.getResource('api')!.addResource('resources').addMethod('GET', new apigateway.LambdaIntegration(resourcesHandler));

    // /api/audit
    const audit = api.root.getResource('api')!.addResource('audit');
    audit.addResource('{dossierId}').addMethod('GET', new apigateway.LambdaIntegration(auditHandler));

    // ─── CloudFront Distribution ───────────────────────────────────────

    const distribution = new cloudfront.Distribution(this, 'FrontendDistribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(frontendBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
    });

    // ─── Frontend Deployment ───────────────────────────────────────────

    new s3deploy.BucketDeployment(this, 'DeployFrontend', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../../frontend/dist'))],
      destinationBucket: frontendBucket,
      distribution,
      distributionPaths: ['/*'],
    });

    // ─── Outputs ───────────────────────────────────────────────────────

    new cdk.CfnOutput(this, 'CloudFrontUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'Frontend URL',
    });

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });
  }
}
