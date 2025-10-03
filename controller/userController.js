
const loadHomepage = async (req,res) =>{
    try {

        return res.render("home")
        
    } catch (error) {
        console.log("Home page not found")   // to showing error to back end
        res.status(500).send("server error")  // to showing error to frnd end

    }

}

const pageNotFound = async (req,res)=>{
    try {
        res.render("pagenotfound")
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

module.exports = {
    loadHomepage,
    pageNotFound,
}