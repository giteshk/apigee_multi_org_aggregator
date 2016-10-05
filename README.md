# apigee_multi_org_aggregator

Purpose of this project is to create a nodejs proxy to allow a developer portal to work with two or more Edge Orgs

## SETUP
1. Clone the project.
2. Download the dependencies using _npm install_
3. Install the proxy using
    _apigeetool deploynodeapp -u <username> -o <org> -e <env> -n 'Apigee-Multi-Org-Aggregator' -d . -m aggregator.js -b /multiorg_
4. Create a vault with the name __aggregator_org_info__
5. Add the entries of the orgs that you want to connect using this proxy
     * MGMT API to [Create a vault entry](http://docs.apigee.com/management/apis/post/organizations/%7Borg_name%7D/environments/%7Benv_name%7D/vaults/%7Bvault_name_in_env%7D/entries)
     * name can be the organization name (eg. gkli)
     * value would be \<orgname\>,\<endpoint\>,\<username\>,\<password\>
        e.g. gkli,https://api.enterprise.apigee.com/v1,edgeorgadmin@apigee.com,edgePa55w0rd
     * You can add multiple organizations
6. In the developer portal you would use the orgadmin credentials for the org that this proxy is deployed to and replace the endpoint
 with the one this proxy is deployed on. (proxy verifies the credentials passed from the developer portal against the current org before proceeding)

**This proxy needs an update to developer portal code base so that the machine name is not validated when editing existing apps.**
**Proxy adds {{orgname}} to the internal name to keep track of where the product exists**

### API Products
 API products are aggregated from all organizations on the add an app page.

### APP
 Apps are pulled from all the orgs
 __You can only create apps using products from one org.__

### Analytics
 Analytics are pulled from the org in which the app resides.


### Developers
 Developers are created in the org the proxy is hosted on by default.
 Developer is created on other orgs only if they are creating an app using the products from those orgs.
 Developer is deleted from all orgs.


### SmartDocs
 SmartDocs are stored in the org which hosts the proxy
