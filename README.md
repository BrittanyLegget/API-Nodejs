# Project Details

Node.js REST API hosted on Google Cloud Platform that utilizes AUTH0 for account creation and authentication.

After user creates account, or logs in with existing account, the user is directed to a profile page that displays their JWT. This JWT is used for authentication for the endpoints related to the protected entity (Boats entity) which can be tested in the postman collection linked below.

The application uses Google Datastore for the database which has 3 entities; Users, Boats, and Loads. Please see API documentation for data model details.

# Requirements

### AUTH0

To get started, you'll need to create a [free Auth0 account](https://auth0.com/signup) and [register an Application](https://auth0.com/docs/get-started/applications).

Then configure .env.sample file with [Auth0 Credentials](https://auth0.com/docs/quickstart/webapp/express/01-login) and change the file name to .env

### Google Cloud

Create a [Google Cloud Project](https://cloud.google.com/resource-manager/docs/creating-managing-projects)

# API Documentation

[API Documentation](https://github.com/BrittanyLegget/CS493/blob/main/API%20Documentation.pdf).

# Test Collection

[Postman test collection](https://documenter.getpostman.com/view/18978957/Uz5JHabG)

The postman environment has 2 variables (jwt1 and jwt2) that need to be set to the JWT received from the AUTH0 login. These are required to test that the protected endpoints are working properly.

If you do not want to use the UI, after setting up a free Auth0 account, you can also send a Post request to get the JWT's. The post request will have this structure:

```bash
POST / https://{Your AUTH0 Domain}/oauth/token
{
    "grant_type": "password",
    "username": "",
    "password": "",
    "client_id": "",
    "client_secret":""
}
```

# How to run

npm

```bash
npm install
```

```bash
npm start
```
